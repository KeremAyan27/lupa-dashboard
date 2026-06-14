"use client";

// Overview — date filter, summary strip, 4 KPI cards and the revenue trend
// for the selected range, with anomaly dots from the alert engine.

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/use-api";
import { formatDate, formatPct, formatTLCompact } from "@/lib/format";
import { useTheme } from "@/components/theme";
import { ActiveAlerts } from "@/components/ActiveAlerts";
import { DateRangeFilter, useFilters } from "@/components/filters";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SummaryStrip,
} from "@/components/ui";
import type { ChartPalette } from "@/components/theme";
import type { OverviewResponse } from "@/types/atlas";

export default function OverviewPage() {
  const { from, to } = useFilters();
  const { data, loading, error } = useApi<OverviewResponse>(
    `/api/overview?from=${from}&to=${to}`,
  );
  const { chart } = useTheme();

  return (
    <div className="flex flex-col gap-3.5 p-4">
      <DateRangeFilter />

      {loading && <LoadingState label="Loading KPIs…" />}
      {!loading && (error || !data) && <ErrorState message={error ?? "No data"} />}
      {data && data.trend.length === 0 && <EmptyState />}
      {data && data.trend.length > 0 && (
        <OverviewContent data={data} chart={chart} />
      )}
    </div>
  );
}

function OverviewContent({
  data,
  chart,
}: {
  data: OverviewResponse;
  chart: ChartPalette;
}) {
  const { kpis, trend: series, granularity, anomalies, summary } = data;

  const cards = [
    {
      key: "revenue",
      label: "Total Revenue",
      value: formatTLCompact(kpis.revenue),
      changePct: kpis.revenueChangePct,
      href: "/sales",
      danger: false,
    },
    {
      key: "conversion",
      label: "Conversion Rate",
      value: `%${kpis.conversionRatePct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`,
      changePct: kpis.conversionChangePct,
      danger: false,
    },
    {
      key: "roi",
      label: "ROI",
      value: `%${Math.round(kpis.roiPct)}`,
      changePct: kpis.roiChangePct,
      danger: false,
    },
    {
      key: "growth",
      label: "Growth Rate",
      value: kpis.growthRatePct === null ? "—" : formatPct(kpis.growthRatePct),
      changePct: kpis.growthRatePct,
      danger: (kpis.growthRatePct ?? 0) < 0,
    },
  ] as const;

  // Monthly buckets chart in M ₺, daily/weekly in K ₺
  const divisor = granularity === "monthly" ? 1_000_000 : 1_000;
  const trend = series.map((d) => ({
    key: d.key,
    label: d.label,
    value: d.revenue / divisor,
  }));
  // R1 is a month-level rule: anomaly dots appear only at monthly granularity
  const anomalyDots =
    granularity === "monthly"
      ? anomalies.flatMap((a) => {
          const point = trend.find((p) => p.key === a.date.slice(0, 7));
          return point ? [{ ...a, x: point.label, y: point.value }] : [];
        })
      : [];
  const tickInterval = Math.max(0, Math.floor(trend.length / 6));
  const unitLabel = granularity === "monthly" ? "M ₺ / month" : `K ₺ / ${granularity === "weekly" ? "week" : "day"}`;

  return (
    <>
      <SummaryStrip
        items={[
          {
            label: "Orders",
            value: summary.orders.toLocaleString("tr-TR"),
            note: `${summary.delivered.toLocaleString("tr-TR")} delivered in selected range`,
          },
          {
            label: "Avg Order",
            value: formatTLCompact(summary.avgOrderValue),
            note: "revenue ÷ delivered orders",
          },
          {
            label: "Anomalies",
            value: String(anomalies.length),
            note: "rule R1 hits in selected range",
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => {
          const body = (
            <Card
              key={card.key}
              className={`h-full p-3.5 ${card.danger ? "border-red/30" : ""}`}
            >
              <div className="mb-1.5 text-[11.5px] text-sub">{card.label}</div>
              <div
                className={`font-display text-[21px] font-bold tracking-tight ${card.danger ? "text-red" : ""}`}
              >
                {card.value}
              </div>
              {card.changePct !== null && (
                <div
                  className={`mt-1 flex items-center gap-1 text-[11px] ${card.changePct >= 0 ? "text-mint" : "text-red"}`}
                >
                  {card.changePct >= 0 ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownRight size={13} />
                  )}
                  {formatPct(card.changePct)}
                  <span className="ml-0.5 text-faint">· prev. period</span>
                </div>
              )}
              {"href" in card && card.href && (
                <div className="mt-1.5 text-[10px] text-mint">
                  tap for details →
                </div>
              )}
            </Card>
          );
          return "href" in card && card.href ? (
            <Link key={card.key} href={card.href}>
              {body}
            </Link>
          ) : (
            body
          );
        })}
      </div>

      <Card className="p-4">
        <div className="mb-2.5 flex justify-between">
          <span className="text-[13.5px] font-semibold">Revenue Trend</span>
          <span className="text-[11px] text-faint">{unitLabel}</span>
        </div>
        <div className="-mx-2 h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend}
              margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chart.mint} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chart.mint} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: chart.faint, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fill: chart.faint, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chart.mint}
                strokeWidth={2}
                fill="url(#trendFill)"
              />
              {anomalyDots.map((a) => (
                <ReferenceDot
                  key={a.date}
                  x={a.x}
                  y={a.y}
                  r={4}
                  fill={a.type === "revenue_drop" ? chart.red : chart.amber}
                  stroke="none"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {anomalyDots.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {anomalyDots.map((a) => (
              <div
                key={a.date}
                className="flex items-center gap-1.5 text-[10.5px] text-sub"
              >
                <span
                  className={`size-2 rounded-full ${a.type === "revenue_drop" ? "bg-red" : "bg-amber"}`}
                />
                {formatDate(a.date)} · {a.title}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ActiveAlerts />
    </>
  );
}
