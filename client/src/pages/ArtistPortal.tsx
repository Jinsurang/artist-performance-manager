import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Star, LogOut, CheckCircle2, Clock, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { DEFAULT_RATE_FALLBACK, computeSettlement, won, tipTime, type SettlementAmounts, type TipEntry } from "@/lib/settlement";

const SESSION_KEY = "artistPortalSession";

type PortalSession = {
  token: string;
  expiresAt: number;
  realName: string | null;
  artists: { id: number; name: string }[];
};

function loadSession(): PortalSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PortalSession;
    if (!s.token || s.expiresAt <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: PortalSession | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // 세션 저장이 막힌 환경에서는 새로고침 시 다시 조회하면 된다
  }
}

type PortalRow = {
  id: number;
  artistId: number;
  artistName: string | null;
  artistMemberCount: number | null;
  performanceDate: Date | string;
  actualMemberCount: number | null;
  perPersonRate: number | null;
  extraTip: number;
  setCount: number | null;
  paidAt: Date | string | null;
};

type PortalComputed = PortalRow & SettlementAmounts & { tips: TipEntry[] };

export default function ArtistPortal() {
  const [session, setSession] = useState<PortalSession | null>(() => loadSession());
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const login = trpc.artistPortal.login.useMutation({
    onSuccess: data => {
      const s: PortalSession = { token: data.token, expiresAt: data.expiresAt, realName: data.realName, artists: data.artists };
      saveSession(s);
      setSession(s);
      setLast4("");
    },
  });

  const settlement = trpc.artistPortal.getSettlement.useQuery(
    { token: session?.token || "", year, month },
    { enabled: !!session, retry: false }
  );

  useEffect(() => {
    if (settlement.error?.data?.code === "UNAUTHORIZED") {
      saveSession(null);
      setSession(null);
    }
  }, [settlement.error]);

  const logout = () => {
    saveSession(null);
    setSession(null);
    setName("");
    setLast4("");
  };

  const defaultRate = parseInt(settlement.data?.defaultRateSetting || "", 10) || DEFAULT_RATE_FALLBACK;

  const rows = useMemo<PortalComputed[]>(() => {
    const tipsByPerf = new Map<number, TipEntry[]>();
    for (const t of (settlement.data?.tips || []) as TipEntry[]) {
      const list = tipsByPerf.get(t.performanceId) || [];
      list.push(t);
      tipsByPerf.set(t.performanceId, list);
    }
    return ((settlement.data?.rows || []) as PortalRow[])
      .map(r => ({ ...r, ...computeSettlement(r, defaultRate), tips: tipsByPerf.get(r.id) || [] }))
      .filter(r => r.date.getFullYear() === year && r.date.getMonth() === month - 1)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [settlement.data, defaultRate, year, month]);

  const teams = useMemo(() => {
    const map = new Map<number, { name: string; rows: PortalComputed[] }>();
    for (const r of rows) {
      const t = map.get(r.artistId) || { name: r.artistName || "", rows: [] };
      t.rows.push(r);
      map.set(r.artistId, t);
    }
    return Array.from(map.values());
  }, [rows]);

  const totals = useMemo(() => ({
    count: rows.length,
    tips: rows.reduce((s, r) => s + (r.extraTip || 0), 0),
    pre: rows.reduce((s, r) => s + r.pre, 0),
    tax: rows.reduce((s, r) => s + r.tax, 0),
    post: rows.reduce((s, r) => s + r.post, 0),
    paid: rows.filter(r => r.paidAt).length,
  }), [rows]);

  const canSubmit = name.trim().length > 0 && /^\d{4}$/.test(last4) && !login.isPending;

  return (
    <div className="min-h-screen bg-[#fcfdfc] text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
          <a href="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-sm">
              <Star className="h-4 w-4 text-white fill-current" />
            </div>
            <div className="leading-none">
              <h1 className="text-base font-black tracking-tighter text-primary">작은따옴표</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">정산내역 조회</p>
            </div>
          </a>
          {session ? (
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold text-slate-500 gap-1" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" /> 나가기
            </Button>
          ) : (
            <a href="/" className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> 공연 신청
            </a>
          )}
        </div>
      </header>

      <main className="container px-4 py-8 max-w-2xl mx-auto flex-1 w-full">
        {!session ? (
          <div className="max-w-sm mx-auto mt-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">정산내역 조회</h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                아티스트 등록 시 알려주신<br />담당자 실명과 연락처 뒷 4자리를 입력해주세요.
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={e => {
                e.preventDefault();
                if (canSubmit) login.mutate({ name: name.trim(), phoneLast4: last4 });
              }}
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">담당자 실명</Label>
                <Input
                  autoFocus
                  autoComplete="name"
                  placeholder="홍길동"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-12 rounded-xl bg-white border-slate-200 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">연락처 뒷 4자리</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0000"
                  maxLength={4}
                  value={last4}
                  onChange={e => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-12 rounded-xl bg-white border-slate-200 text-base tracking-[0.4em] text-center font-bold"
                />
              </div>

              {login.error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 leading-relaxed">
                  {login.error.message}
                </p>
              )}

              <Button type="submit" disabled={!canSubmit} className="w-full h-12 rounded-xl font-black text-sm">
                {login.isPending ? "확인 중..." : "내역 확인"}
              </Button>
              <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                정보가 등록되지 않았거나 조회가 안 되면 관리자에게 문의해주세요.
              </p>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-500">안녕하세요,</p>
              <h2 className="text-2xl font-black tracking-tight">{session.realName || session.artists[0]?.name}님</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {session.artists.map(a => (
                  <span key={a.id} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-black">{a.name}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentMonth(new Date(year, month - 2, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-black">{year}년 {month}월</h3>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentMonth(new Date(year, month, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-lg shadow-slate-900/10">
              <p className="text-[11px] font-bold text-slate-400">{month}월 세후 지급액</p>
              <p className="mt-1 text-3xl font-black tracking-tight">{won(totals.post)}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] font-bold text-slate-400">공연</p>
                  <p className="text-sm font-black">{totals.count}회</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] font-bold text-slate-400">팁 합계</p>
                  <p className="text-sm font-black">{totals.tips.toLocaleString("ko-KR")}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] font-bold text-slate-400">원천징수 3.3%</p>
                  <p className="text-sm font-black">{totals.tax.toLocaleString("ko-KR")}</p>
                </div>
              </div>
              {rows.length > 0 && (
                <p className={`mt-4 text-[11px] font-bold flex items-center gap-1.5 ${totals.paid === rows.length ? "text-amber-300" : "text-slate-300"}`}>
                  {totals.paid === rows.length ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {totals.paid === rows.length ? "입금이 완료되었습니다" : totals.paid > 0 ? `${totals.paid}/${rows.length}건 입금완료` : "입금 예정입니다"}
                </p>
              )}
            </div>

            {settlement.isLoading ? (
              <p className="text-center py-12 text-sm font-bold text-slate-400">불러오는 중...</p>
            ) : rows.length === 0 ? (
              <div className="text-center py-14 rounded-3xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm font-bold text-slate-500">{month}월에는 정산 내역이 없습니다.</p>
                <p className="mt-1 text-[11px] text-slate-400">확정된 공연만 표시됩니다.</p>
              </div>
            ) : (
              teams.map(team => (
                <section key={team.name} className="space-y-3">
                  {teams.length > 1 && <h4 className="px-1 text-sm font-black text-slate-700">{team.name}</h4>}
                  {team.rows.map(r => (
                    <article key={r.id} className="rounded-3xl bg-white border border-slate-200 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black tracking-tight">{format(r.date, "M월 d일", { locale: ko })}
                            <span className="ml-1.5 text-sm font-bold text-slate-400">{format(r.date, "EEEE", { locale: ko })}</span>
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-600">{r.sets === 2 ? "1·2부" : "1부"}</span>
                            {teams.length > 1 && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-black text-primary">{r.artistName}</span>}
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${r.paidAt ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                          {r.paidAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {r.paidAt ? `입금완료 ${format(new Date(r.paidAt), "M/d")}` : "입금 예정"}
                        </span>
                      </div>

                      <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-slate-500">공연비 <span className="text-[11px] text-slate-400">{r.headcount}명 × {r.rate.toLocaleString("ko-KR")}{r.sets === 2 ? " × 2부" : ""}</span></dt>
                          <dd className="font-bold tabular-nums">{(r.headcount * r.rate * r.sets).toLocaleString("ko-KR")}원</dd>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <dt className="text-slate-500 shrink-0">팁</dt>
                          <dd className="text-right">
                            <span className="font-bold tabular-nums">{(r.extraTip || 0).toLocaleString("ko-KR")}원</span>
                            {r.tips.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {r.tips.map(t => (
                                  <li key={t.id} className="text-[11px] text-slate-500">
                                    <span className="text-slate-400 tabular-nums mr-1.5">{tipTime(t)}</span>
                                    <span className={t.depositor ? "font-bold text-slate-700" : "text-slate-400"}>{t.depositor || "무기명"}</span>
                                    <span className="ml-1.5 tabular-nums">{t.amount.toLocaleString("ko-KR")}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          세전 {r.pre.toLocaleString("ko-KR")}원<br />원천징수 −{r.tax.toLocaleString("ko-KR")}원
                        </p>
                        <p className="text-right">
                          <span className="block text-[10px] font-bold text-slate-400">세후 지급액</span>
                          <span className="text-xl font-black tabular-nums tracking-tight">{won(r.post)}</span>
                        </p>
                      </div>
                    </article>
                  ))}
                </section>
              ))
            )}

            <p className="text-center text-[11px] text-slate-400 leading-relaxed pt-2">
              세후 지급액은 3.3% 원천징수 후 금액입니다.<br />내역에 문의가 있으면 관리자에게 연락해주세요.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
