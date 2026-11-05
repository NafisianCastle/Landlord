/** Month ranges are inclusive. Shared by the preview and the server boundary. */
export interface RentRange { from: string; to: string; amount: string }
export type RentHistoryError = "invalidRanges" | "invalidMonth" | "invalidAmount" | "reversedRange" | "overlap" | "outsideLease" | "futureMonth" | "tooManyMonths";
export interface HistoryMonth { month: string; amount: number }

export function expandRentRanges(input: unknown, startDate: string, endDate: string | null, today: string):
  { months: HistoryMonth[]; error?: never } | { error: RentHistoryError; months?: never } {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) return { error: "invalidRanges" };
  const months = new Map<string, number>();
  const monthPattern = /^(19|[2-9]\d)\d{2}-(0[1-9]|1[0-2])$/;
  for (const range of input) {
    if (!range || typeof range !== "object" || typeof range.from !== "string" || typeof range.to !== "string" ||
        !monthPattern.test(range.from) || !monthPattern.test(range.to)) return { error: "invalidMonth" };
    if (typeof range.amount !== "string" || !/^\d{1,13}(\.\d{1,2})?$/.test(range.amount) ||
        Number(range.amount) <= 0 || Number(range.amount) > 1_000_000_000_000) return { error: "invalidAmount" };
    if (range.from > range.to) return { error: "reversedRange" };
    if (range.from < startDate.slice(0, 7) || (endDate && range.to > endDate.slice(0, 7))) return { error: "outsideLease" };
    if (range.to > today.slice(0, 7)) return { error: "futureMonth" };
    let [year, month] = range.from.split("-").map(Number);
    while (true) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (months.has(key)) return { error: "overlap" };
      months.set(key, Number(range.amount));
      if (months.size > 600) return { error: "tooManyMonths" };
      if (key === range.to) break;
      if (++month === 13) { year++; month = 1; }
    }
  }
  return { months: [...months].map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month)) };
}
