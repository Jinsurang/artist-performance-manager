import { holidayName, splitHolidayName } from "@/lib/holidays";

export function HolidayLabel({ date, colorClass }: { date: Date; colorClass: string }) {
  const name = holidayName(date);
  if (!name) return null;
  const [main, detail] = splitHolidayName(name);
  return (
    <span className={`sm:pt-px text-[9px] sm:text-[10px] font-bold leading-tight break-keep tracking-tighter sm:tracking-normal ${colorClass}`}>
      {main}
      {detail && <span className="block sm:inline">{detail}</span>}
    </span>
  );
}
