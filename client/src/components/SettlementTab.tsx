import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, AlertTriangle, Users, CalendarDays, Wallet, Banknote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const DEFAULT_RATE_KEY = "settlement_default_rate";
const WITHHOLDING_RATE = 0.033;
const HEADER_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

type SettlementRow = {
  id: number;
  artistId: number;
  title: string;
  performanceDate: Date | string;
  actualMemberCount: number | null;
  perPersonRate: number | null;
  extraTip: number;
  artistName: string | null;
  artistMemberCount: number | null;
  artistRealName: string | null;
  artistResidentNumber: string | null;
  artistBankAccount: string | null;
};

type ComputedRow = SettlementRow & {
  date: Date;
  headcount: number;
  rate: number;
  pre: number;
  tax: number;
  post: number;
};

type ArtistGroup = {
  key: string;
  artistId: number;
  name: string;
  realName: string | null;
  residentNumber: string | null;
  bankAccount: string | null;
  defaultMemberCount: number;
  rows: ComputedRow[];
  pre: number;
  tax: number;
  post: number;
};

function computeRow(row: SettlementRow, defaultRate: number): ComputedRow {
  const headcount = row.actualMemberCount ?? row.artistMemberCount ?? 1;
  const rate = row.perPersonRate ?? defaultRate;
  const pre = headcount * rate + (row.extraTip || 0);
  const tax = Math.round(pre * WITHHOLDING_RATE);
  return { ...row, date: new Date(row.performanceDate), headcount, rate, pre, tax, post: pre - tax };
}

function EditableNumber({
  value,
  placeholder,
  suffix,
  onCommit,
  className = "",
}: {
  value: number | null;
  placeholder?: string;
  suffix: string;
  onCommit: (next: number | null) => void;
  className?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const digits = text.replace(/[^\d]/g, "");
    const next = digits === "" ? null : parseInt(digits, 10);
    if (next !== value) onCommit(next);
    setText(next == null ? "" : String(next));
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-9 pr-7 rounded-lg bg-white border-slate-200 text-sm font-bold text-right"
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">{suffix}</span>
    </div>
  );
}

export function SettlementTab() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settlement.getMonthly.useQuery({ year, month });
  const { data: defaultRateSetting } = trpc.settings.get.useQuery({ key: DEFAULT_RATE_KEY }, { retry: false });
  const defaultRate = parseInt(defaultRateSetting || "0", 10) || 0;

  const updateSetting = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate({ key: DEFAULT_RATE_KEY });
      toast.success("기본 인원수당이 저장되었습니다.");
    },
    onError: () => toast.error("기본 인원수당 저장 실패"),
  });

  const updateSettlement = trpc.settlement.update.useMutation({
    onSuccess: () => utils.settlement.getMonthly.invalidate({ year, month }),
    onError: () => toast.error("정산 정보 저장 실패"),
  });

  const rows = useMemo<ComputedRow[]>(() => {
    return ((data || []) as SettlementRow[])
      .map(r => computeRow(r, defaultRate))
      .filter(r => r.date.getFullYear() === year && r.date.getMonth() === month - 1)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data, defaultRate, year, month]);

  const groups = useMemo<ArtistGroup[]>(() => {
    const map = new Map<string, ArtistGroup>();
    for (const row of rows) {
      const key = row.artistId ? `id-${row.artistId}` : `name-${row.artistName || row.title}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          artistId: row.artistId,
          name: row.artistName || row.title.split(" ")[0],
          realName: row.artistRealName,
          residentNumber: row.artistResidentNumber,
          bankAccount: row.artistBankAccount,
          defaultMemberCount: row.artistMemberCount ?? 1,
          rows: [],
          pre: 0,
          tax: 0,
          post: 0,
        };
        map.set(key, group);
      }
      group.rows.push(row);
      group.pre += row.pre;
      group.tax += row.tax;
      group.post += row.post;
    }
    return Array.from(map.values());
  }, [rows]);

  const totals = useMemo(() => ({
    artists: groups.length,
    performances: rows.length,
    pre: rows.reduce((s, r) => s + r.pre, 0),
    tax: rows.reduce((s, r) => s + r.tax, 0),
    post: rows.reduce((s, r) => s + r.post, 0),
    missingInfo: groups.filter(g => !g.bankAccount || !g.realName).length,
  }), [groups, rows]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDay = getDay(startOfMonth(currentMonth));
  const emptySlots = firstDay === 0 ? 6 : firstDay - 1;

  const scrollToRow = (id: number) => {
    const el = document.getElementById(`settle-row-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-indigo-400");
    setTimeout(() => el.classList.remove("ring-2", "ring-indigo-400"), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Month navigation + default rate */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setCurrentMonth(new Date(year, month - 2, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-black min-w-[110px] text-center">{year}년 {month}월 정산</h3>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setCurrentMonth(new Date(year, month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg text-xs font-bold" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
            이번 달
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[11px] font-black text-slate-500 whitespace-nowrap">기본 인원수당</Label>
          <EditableNumber
            value={defaultRate || null}
            placeholder="0"
            suffix="원"
            className="w-32"
            onCommit={next => updateSetting.mutate({ key: DEFAULT_RATE_KEY, value: String(next ?? 0) })}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl border-none bg-blue-50/60">
          <p className="text-[9px] font-black text-blue-400 uppercase flex items-center gap-1"><Users className="h-3 w-3" /> 정산 아티스트</p>
          <h4 className="text-xl font-black text-blue-700">{totals.artists}팀</h4>
        </Card>
        <Card className="p-4 rounded-2xl border-none bg-emerald-50/60">
          <p className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1"><CalendarDays className="h-3 w-3" /> 공연 건수</p>
          <h4 className="text-xl font-black text-emerald-700">{totals.performances}건</h4>
        </Card>
        <Card className="p-4 rounded-2xl border-none bg-slate-100/70">
          <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Wallet className="h-3 w-3" /> 세전 합계</p>
          <h4 className="text-xl font-black text-slate-700">{won(totals.pre)}</h4>
          <p className="text-[10px] font-bold text-slate-400">원천징수 3.3% · {won(totals.tax)}</p>
        </Card>
        <Card className="p-4 rounded-2xl border-none bg-indigo-600 text-white">
          <p className="text-[9px] font-black text-indigo-200 uppercase flex items-center gap-1"><Banknote className="h-3 w-3" /> 세후 지급 총액</p>
          <h4 className="text-xl font-black">{won(totals.post)}</h4>
        </Card>
      </div>

      {totals.missingInfo > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          정산 정보(실명/계좌)가 등록되지 않은 아티스트가 {totals.missingInfo}팀 있습니다. 아티스트 탭에서 수정해주세요.
        </div>
      )}

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-px bg-primary/5 rounded-xl overflow-hidden border border-primary/10">
        {HEADER_DAYS.map(d => (
          <div key={d} className={`text-center py-2 text-[10px] font-black uppercase tracking-tighter bg-white ${d === "토" ? "text-blue-500" : d === "일" ? "text-red-500" : "text-muted-foreground"}`}>
            {d}
          </div>
        ))}
        {Array(emptySlots).fill(null).map((_, i) => <div key={`empty-${i}`} className="bg-white/50 min-h-[72px] sm:min-h-[96px]" />)}
        {daysInMonth.map(date => {
          const weekDay = getDay(date);
          const dayRows = rows.filter(r => isSameDay(r.date, date));
          const dayTotal = dayRows.reduce((s, r) => s + r.pre, 0);
          return (
            <div key={date.toISOString()} className="bg-white min-h-[72px] sm:min-h-[96px] p-1 sm:p-2 border-t border-l border-primary/5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${weekDay === 0 ? "text-red-500" : weekDay === 6 ? "text-blue-500" : ""}`}>{date.getDate()}</span>
                {dayTotal > 0 && <span className="hidden sm:inline text-[9px] font-bold text-slate-400">{dayTotal.toLocaleString("ko-KR")}</span>}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {dayRows.map(r => (
                  <button
                    key={r.id}
                    onClick={() => scrollToRow(r.id)}
                    className="text-left text-[10px] sm:text-[11px] px-1.5 py-1 rounded-md border font-black whitespace-normal break-words bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-colors"
                  >
                    {r.artistName || r.title.split(" ")[0]}
                    <span className="block sm:inline sm:ml-1 text-[9px] font-bold text-emerald-500">{r.headcount}명</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-black text-slate-700">정산 리스트</h4>
          <span className="text-xs font-bold text-slate-500">
            총 <span className="text-indigo-600">{totals.artists}팀</span> · 총 정산금액 <span className="text-indigo-600">{won(totals.post)}</span>
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs font-bold text-slate-400">불러오는 중...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
            {month}월에 확정된 공연이 없습니다.
          </div>
        ) : (
          groups.map(group => {
            const missing = !group.bankAccount || !group.realName;
            return (
              <Card key={group.key} className="rounded-2xl border-slate-200 shadow-none overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-slate-900">{group.name}</h4>
                      <span className="text-[10px] font-bold text-slate-400">기본 {group.defaultMemberCount}명 · {group.rows.length}회 공연</span>
                    </div>
                    {missing ? (
                      <p className="mt-1 text-[11px] font-bold text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> 정산 정보 미등록
                      </p>
                    ) : (
                      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
                        <dt className="font-bold text-slate-400">실명</dt><dd className="font-bold text-slate-700">{group.realName}</dd>
                        <dt className="font-bold text-slate-400">주민번호</dt><dd className="font-bold text-slate-700 tabular-nums">{group.residentNumber || "-"}</dd>
                        <dt className="font-bold text-slate-400">계좌</dt><dd className="font-bold text-slate-700 tabular-nums break-all">{group.bankAccount}</dd>
                      </dl>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">세전 {won(group.pre)} · 세금 {won(group.tax)}</p>
                    <p className="text-lg font-black text-indigo-600">{won(group.post)}</p>
                    <p className="text-[10px] font-bold text-slate-400">세후 지급액</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.rows.map(row => (
                    <div id={`settle-row-${row.id}`} key={row.id} className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-[110px_1fr_1fr_1fr_auto] gap-2 sm:gap-3 items-center transition-shadow rounded-lg">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-sm font-black text-slate-800">{format(row.date, "M월 d일", { locale: ko })}</p>
                        <p className="text-[10px] font-bold text-slate-400">{format(row.date, "EEEE", { locale: ko })}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-slate-400 uppercase">실제 인원</Label>
                        <EditableNumber
                          value={row.actualMemberCount}
                          placeholder={String(row.artistMemberCount ?? 1)}
                          suffix="명"
                          onCommit={next => updateSettlement.mutate({ id: row.id, actualMemberCount: next })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-slate-400 uppercase">인원수당</Label>
                        <EditableNumber
                          value={row.perPersonRate}
                          placeholder={String(defaultRate)}
                          suffix="원"
                          onCommit={next => updateSettlement.mutate({ id: row.id, perPersonRate: next })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-slate-400 uppercase">추가 팁</Label>
                        <EditableNumber
                          value={row.extraTip || null}
                          placeholder="0"
                          suffix="원"
                          onCommit={next => updateSettlement.mutate({ id: row.id, extraTip: next ?? 0 })}
                        />
                      </div>
                      <div className="text-right sm:min-w-[120px]">
                        <p className="text-[10px] font-bold text-slate-400">{row.headcount}명 × {row.rate.toLocaleString("ko-KR")} + {row.extraTip.toLocaleString("ko-KR")}</p>
                        <p className="text-[11px] font-bold text-slate-500">세전 {won(row.pre)}</p>
                        <p className="text-sm font-black text-slate-800">세후 {won(row.post)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
