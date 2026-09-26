import { format, getDay } from "date-fns";

export const DEFAULT_RATE_FALLBACK = 25000;
export const WITHHOLDING_RATE = 0.033;

// 금·토·일은 1부/2부 두 번 공연
const DOUBLE_SET_WEEKDAYS = [5, 6, 0];
export const autoSetCount = (date: Date) => (DOUBLE_SET_WEEKDAYS.includes(getDay(date)) ? 2 : 1);

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export type SettlementInput = {
  performanceDate: Date | string;
  actualMemberCount: number | null;
  artistMemberCount: number | null;
  perPersonRate: number | null;
  extraTip: number;
  setCount: number | null;
};

export type SettlementAmounts = {
  date: Date;
  headcount: number;
  rate: number;
  sets: number;
  pre: number;
  tax: number;
  post: number;
};

export function computeSettlement(row: SettlementInput, defaultRate: number): SettlementAmounts {
  const date = new Date(row.performanceDate);
  const headcount = row.actualMemberCount ?? row.artistMemberCount ?? 1;
  const rate = row.perPersonRate ?? defaultRate;
  const sets = row.setCount ?? autoSetCount(date);
  const pre = headcount * rate * sets + (row.extraTip || 0);
  const tax = Math.round(pre * WITHHOLDING_RATE);
  return { date, headcount, rate, sets, pre, tax, post: pre - tax };
}

export type TipEntry = {
  id: number;
  performanceId: number;
  tippedAt: Date | string;
  amount: number;
  depositor: string | null;
};

// 입금 시각으로 1부/2부를 구분할 수 있게 시:분을 함께 표기
export const tipTime = (t: TipEntry) => format(new Date(t.tippedAt), "HH:mm");

export const tipSummary = (tips: TipEntry[]) =>
  tips.map(t => `${tipTime(t)} ${t.depositor || "무기명"} ${t.amount.toLocaleString("ko-KR")}`).join(" · ");
