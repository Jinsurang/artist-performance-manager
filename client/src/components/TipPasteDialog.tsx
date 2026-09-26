import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ComputedRow } from "@/components/SettlementTab";
import { won } from "@/lib/settlement";

const FULL_DATE = /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/;
const SHORT_DATE = /(?<![\d.])(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?(?![\d.])/;
const TIME = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const NUMBER = /-?\d[\d,]*(?:\.\d+)?/g;
const NUMERIC_CELL = /^-?\d[\d,]*(?:\.\d+)?\s*원?$/;
// 은행 내역에서 입금자명이 아닌 상투적 토큰
const NOISE_TOKENS = new Set(["코드받기", "입금", "출금", "이체", "원"]);

const isNoise = (token: string) => /^\[.?\]$/.test(token) || NOISE_TOKENS.has(token);

type ParsedLine = {
  raw: string;
  date: Date | null;
  numbers: number[];
  depositor: string;
};

function parseLine(raw: string, defaultYear: number): ParsedLine {
  let date: Date | null = null;
  let time: { h: number; m: number; s: number } | null = null;
  const cells = raw.includes("\t") ? raw.split("\t").map(c => c.trim()) : raw.split(/\s+/);
  const numbers: number[] = [];
  const textTokens: string[] = [];

  for (const cell of cells) {
    if (!cell) continue;
    let rest = cell;
    if (!date) {
      const full = rest.match(FULL_DATE);
      if (full) {
        date = new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));
        rest = rest.replace(full[0], " ");
      } else {
        const short = rest.match(SHORT_DATE);
        if (short) {
          date = new Date(defaultYear, Number(short[1]) - 1, Number(short[2]));
          rest = rest.replace(short[0], " ");
        }
      }
    }
    const t = rest.match(TIME);
    if (t) {
      if (!time) time = { h: Number(t[1]), m: Number(t[2]), s: Number(t[3] || 0) };
      rest = rest.replace(t[0], " ");
    }
    rest = rest.trim();
    if (!rest) continue;

    if (NUMERIC_CELL.test(rest)) {
      const n = Number(rest.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) numbers.push(n);
      continue;
    }
    const inline = rest.match(NUMBER);
    if (inline && rest.replace(NUMBER, "").trim() === "") {
      inline.forEach(tok => numbers.push(Number(tok.replace(/,/g, ""))));
      continue;
    }
    // 송금자명은 은행에 등록된 그대로 보존한다. 셀 전체가 상투 문구([+] 코드받기 등)일 때만 버린다.
    const tokens = rest.split(/\s+/);
    if (tokens.every(isNoise)) continue;
    textTokens.push(raw.includes("\t") ? rest : tokens.filter(tok => !isNoise(tok)).join(" "));
  }

  if (date && isNaN(date.getTime())) date = null;
  if (date && time) date.setHours(time.h, time.m, time.s, 0);

  return { raw, date, numbers, depositor: textTokens.join(" ").trim() };
}

type TipDraft = { tippedAt: Date; amount: number; depositor: string };

type PreviewEntry = {
  key: string;
  date: Date;
  amount: number;
  tips: TipDraft[];
  status: "matched" | "ambiguous" | "none" | "other-month";
  candidates: ComputedRow[];
};

export type TipApplyEntry = { performanceId: number; tips: TipDraft[] };

export function TipPasteDialog({
  open,
  onOpenChange,
  rows,
  year,
  month,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ComputedRow[];
  year: number;
  month: number;
  onApply: (entries: TipApplyEntry[]) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [amountIndex, setAmountIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [isApplying, setIsApplying] = useState(false);

  const parsed = useMemo(
    () => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => parseLine(l, year)),
    [text, year]
  );

  const sampleNumbers = parsed.find(p => p.date && p.numbers.length > 0)?.numbers || [];
  const skippedLines = parsed.filter(p => !p.date && p.numbers.length > 0);

  const entries = useMemo<PreviewEntry[]>(() => {
    const map = new Map<string, PreviewEntry>();
    for (const p of parsed) {
      if (!p.date) continue;
      const amount = p.numbers[amountIndex];
      if (amount == null) continue;
      const tip: TipDraft = { tippedAt: p.date, amount, depositor: p.depositor };
      const key = format(p.date, "yyyy-MM-dd");
      const existing = map.get(key);
      if (existing) {
        existing.amount += amount;
        existing.tips.push(tip);
        continue;
      }
      const inMonth = p.date.getFullYear() === year && p.date.getMonth() === month - 1;
      const candidates = inMonth ? rows.filter(r => isSameDay(r.date, p.date!)) : [];
      map.set(key, {
        key,
        date: p.date,
        amount,
        tips: [tip],
        status: !inMonth ? "other-month" : candidates.length === 0 ? "none" : candidates.length === 1 ? "matched" : "ambiguous",
        candidates,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [parsed, amountIndex, rows, year, month]);

  const updates: (TipApplyEntry & { entry: PreviewEntry })[] = entries.flatMap(e => {
    if (e.status === "matched") return [{ performanceId: e.candidates[0].id, tips: e.tips, entry: e }];
    if (e.status === "ambiguous" && choices[e.key]) return [{ performanceId: choices[e.key], tips: e.tips, entry: e }];
    return [];
  });
  const applyTotal = updates.reduce((s, u) => s + u.entry.amount, 0);
  const pendingChoices = entries.filter(e => e.status === "ambiguous" && !choices[e.key]).length;
  const hasDepositors = parsed.some(p => p.date && p.depositor);

  const reset = () => {
    setText("");
    setChoices({});
    setAmountIndex(0);
  };

  const statusBadge = (e: PreviewEntry) => {
    switch (e.status) {
      case "matched": return <span className="text-[10px] font-black text-emerald-600">✓ {e.candidates[0].artistName}</span>;
      case "ambiguous": return <span className="text-[10px] font-black text-amber-600">팀 선택 필요</span>;
      case "none": return <span className="text-[10px] font-black text-slate-400">공연 없음 · 반영 안 함</span>;
      case "other-month": return <span className="text-[10px] font-black text-slate-400">{month}월 아님 · 반영 안 함</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 border-none overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-black text-lg flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5 text-primary" />
            팁정산 한번에 입력
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pt-2 pr-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black text-slate-500">
              엑셀에서 날짜·입금자·금액이 있는 범위를 복사한 뒤 아래에 붙여넣으세요
            </Label>
            <textarea
              autoFocus
              className="w-full min-h-[140px] p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 resize-y placeholder:text-slate-400"
              placeholder={"2026-09-10 20:29:13\t[+] 코드받기\t홍길동\t50,000\t19,510\n2026-09-13 21:02:11\t[+] 코드받기\t김철수\t30,000\t49,510"}
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <p className="text-[10px] font-medium text-slate-400">
              같은 날짜는 합산되어 해당 공연의 "추가 팁"에 <span className="font-black text-slate-500">덮어쓰기</span>되고, 입금자별 내역이 함께 저장됩니다.
              날짜·시간·잔액 등은 자동으로 구분합니다.
            </p>
          </div>

          {sampleNumbers.length > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <Label className="text-[11px] font-black text-indigo-700 whitespace-nowrap">금액 열 선택</Label>
              <select
                className="h-8 rounded-lg border border-indigo-200 bg-white px-2 text-xs font-bold"
                value={amountIndex}
                onChange={e => setAmountIndex(Number(e.target.value))}
              >
                {sampleNumbers.map((n, i) => (
                  <option key={i} value={i}>{i + 1}번째 숫자 (예: {n.toLocaleString("ko-KR")})</option>
                ))}
              </select>
              <span className="text-[10px] font-medium text-indigo-400">한 줄에 숫자가 여러 개라 팁 금액 열을 골라주세요</span>
            </div>
          )}

          {entries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[11px] font-black text-slate-500">미리보기 · {entries.length}일</Label>
                <span className="text-[11px] font-bold text-slate-500">
                  반영 <span className="text-indigo-600">{updates.length}건 · {won(applyTotal)}</span>
                </span>
              </div>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                {entries.map(e => {
                  const target = e.status === "matched" ? e.candidates[0] : e.candidates.find(c => c.id === choices[e.key]);
                  const muted = e.status === "none" || e.status === "other-month";
                  return (
                    <div key={e.key} className={`p-3 space-y-1 ${muted ? "bg-slate-50/60" : "bg-white"}`}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-black text-slate-800 min-w-[72px]">{format(e.date, "M/d (EEE)", { locale: ko })}</span>
                        <span className="text-sm font-black text-indigo-600 min-w-[80px] text-right">{won(e.amount)}</span>
                        {e.tips.length > 1 && <span className="text-[9px] font-bold text-slate-400">{e.tips.length}건 합산</span>}
                        <div className="flex-1 min-w-[140px] flex items-center gap-2">
                          {e.status === "ambiguous" ? (
                            <select
                              className="h-8 rounded-lg border border-amber-300 bg-amber-50 px-2 text-xs font-bold"
                              value={choices[e.key] || ""}
                              onChange={ev => setChoices({ ...choices, [e.key]: Number(ev.target.value) })}
                            >
                              <option value="">팀 선택…</option>
                              {e.candidates.map(c => <option key={c.id} value={c.id}>{c.artistName}</option>)}
                            </select>
                          ) : statusBadge(e)}
                          {target && target.extraTip !== e.amount && (
                            <span className="text-[10px] font-bold text-slate-400">
                              기존 {target.extraTip.toLocaleString("ko-KR")} → {e.amount.toLocaleString("ko-KR")}
                            </span>
                          )}
                        </div>
                      </div>
                      {!muted && (
                        <p className="pl-1 text-[10px] font-medium text-slate-500 leading-relaxed">
                          {e.tips.map((t, i) => (
                            <span key={i} className="inline-block mr-2.5">
                              <span className="text-slate-400 tabular-nums">{format(t.tippedAt, "HH:mm")}</span>{" "}
                              <span className={t.depositor ? "font-bold text-slate-700" : "text-slate-400"}>{t.depositor || "무기명"}</span> {t.amount.toLocaleString("ko-KR")}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {!hasDepositors && (
                <p className="px-1 text-[10px] font-bold text-amber-600">입금자명이 인식되지 않았습니다. 입금자 열까지 포함해서 복사했는지 확인해주세요. (없어도 금액은 반영됩니다)</p>
              )}
            </div>
          )}

          {skippedLines.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                날짜를 인식하지 못한 줄 {skippedLines.length}개는 건너뜁니다:
                <ul className="mt-1 font-mono font-medium text-amber-700">
                  {skippedLines.slice(0, 3).map((l, i) => <li key={i} className="truncate">{l.raw}</li>)}
                  {skippedLines.length > 3 && <li>… 외 {skippedLines.length - 3}개</li>}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-2">
          <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-sm" onClick={() => { reset(); onOpenChange(false); }}>
            취소
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 gap-1.5"
            disabled={updates.length === 0 || isApplying}
            onClick={async () => {
              setIsApplying(true);
              try {
                await onApply(updates.map(({ performanceId, tips }) => ({ performanceId, tips })));
                reset();
                onOpenChange(false);
              } finally {
                setIsApplying(false);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {updates.length}건 반영{pendingChoices > 0 ? ` (${pendingChoices}건 선택 대기)` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
