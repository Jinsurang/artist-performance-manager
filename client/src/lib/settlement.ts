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
  isManual: boolean;
};

export const MANUAL_TIP_LABEL = "직접 입력";

// 입금 시각을 함께 보여 아티스트가 시간대를 판단할 수 있게 한다. 직접 입력 항목은 시각이 없다.
export const tipTime = (t: TipEntry) => (t.isManual ? "" : format(new Date(t.tippedAt), "HH:mm"));
export const tipName = (t: TipEntry) => (t.isManual ? MANUAL_TIP_LABEL : t.depositor || "무기명");

// 붙여넣은 내역은 시각순, 직접 입력 조정 항목은 맨 뒤
export const sortTips = (tips: TipEntry[]) =>
  [...tips].sort((a, b) =>
    Number(a.isManual) - Number(b.isManual) || new Date(a.tippedAt).getTime() - new Date(b.tippedAt).getTime() || a.id - b.id
  );

export const tipSummary = (tips: TipEntry[]) =>
  sortTips(tips).map(t => `${tipTime(t)} ${tipName(t)} ${t.amount.toLocaleString("ko-KR")}`.trim()).join(" · ");
