// Range-adaptive time-series bucketing shared by the overview and sales
// routes. Granularity is derived from the selected range length:
//   ≤ 14 days  → daily buckets   (labels "05.12")
//   ≤ 35 days  → weekly buckets  (labels "Week 1…5", counted from range start)
//   otherwise  → monthly buckets (labels "Jan…Dec")

import { monthLabel } from "./alert-engine";
import { rangeDays, type DateRange } from "./date-range";
import { formatDate } from "./format";
import type { ChartGranularity, EngineAlert, SeriesPoint } from "@/types/atlas";

export function granularityFor(range: DateRange): ChartGranularity {
  const days = rangeDays(range);
  if (days <= 14) return "daily";
  if (days <= 35) return "weekly";
  return "monthly";
}

const MS_PER_DAY = 86_400_000;

function bucketKey(date: string, range: DateRange, g: ChartGranularity): string {
  if (g === "daily") return date.slice(0, 10);
  if (g === "monthly") return date.slice(0, 7);
  const week = Math.floor(
    (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${range.from}T00:00:00Z`)) /
      MS_PER_DAY /
      7,
  );
  return `W${String(week + 1).padStart(2, "0")}`;
}

function bucketLabel(key: string, g: ChartGranularity): string {
  if (g === "daily") return formatDate(key).slice(0, 5);
  if (g === "monthly") return monthLabel(key);
  return `Week ${Number(key.slice(1))}`;
}

/**
 * Bucket dated revenue contributions into a contiguous series. Buckets the
 * data lands in are created on demand; the series is sorted by key, so empty
 * leading/trailing buckets simply don't appear. `anomalyByMonth` entries are
 * attached only at monthly granularity (rule R1 is month-level).
 */
export function buildSeries(
  entries: Iterable<{ date: string; revenue: number }>,
  range: DateRange,
  granularity: ChartGranularity,
  anomalyByMonth?: Map<string, EngineAlert>,
): SeriesPoint[] {
  const buckets = new Map<string, number>();
  for (const { date, revenue } of entries) {
    const key = bucketKey(date, range, granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + revenue);
  }
  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([key, revenue], i) => {
    const prev = i > 0 ? sorted[i - 1][1] : 0;
    return {
      key,
      label: bucketLabel(key, granularity),
      revenue: Math.round(revenue),
      changePct: i > 0 && prev > 0 ? ((revenue - prev) / prev) * 100 : null,
      anomaly:
        granularity === "monthly"
          ? (anomalyByMonth?.get(key) ?? null)
          : null,
    };
  });
}
