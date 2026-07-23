import {
  endOfDay,
  endOfISOWeek,
  endOfMonth,
  endOfYear,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfDay,
  startOfISOWeek,
  startOfMonth,
  startOfYear,
} from "date-fns";

export type ReportPeriodKind = "day" | "week" | "month" | "year";

export function rangeForPeriod(period: ReportPeriodKind, anchor: Date) {
  if (period === "day") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (period === "week") {
    return { from: startOfISOWeek(anchor), to: endOfISOWeek(anchor) };
  }
  if (period === "month") {
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }
  return { from: startOfYear(anchor), to: endOfYear(anchor) };
}

/** Mã kỳ: day=yyyy-MM-dd, week=W30/2026, month=07/2026, year=2026 */
export function formatPeriodCode(period: ReportPeriodKind, anchor: Date): string {
  if (period === "day") return format(anchor, "yyyy-MM-dd");
  if (period === "week") {
    const week = String(getISOWeek(anchor)).padStart(2, "0");
    const year = getISOWeekYear(anchor);
    return `W${week}/${year}`;
  }
  if (period === "month") return format(anchor, "MM/yyyy");
  return format(anchor, "yyyy");
}

export function periodRangeHint(from: Date | string, to: Date | string): string {
  const f = typeof from === "string" ? from : format(from, "yyyy-MM-dd");
  const t = typeof to === "string" ? to : format(to, "yyyy-MM-dd");
  return `${f} → ${t}`;
}

/** Sanitize period code for filenames: W30/2026 → W30_2026 */
export function periodCodeForFilename(code: string): string {
  return code.replace(/\//g, "_");
}
