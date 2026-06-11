"use client";

// Overview — 4 KPI cards + 30-day revenue trend (report §7.2/01-02).

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/use-api";
import { CHART, formatPct, formatTLCompact } from "@/lib/format";
import { Card, ErrorState, LoadingState } from "@/components/ui";
import type { OverviewResponse } from "@/types/atlas";

export default function OverviewPage() {
  const { data, loading, error } = useApi<OverviewResponse>("/api/overview");

  if (loading) return <LoadingState label="Loading KPIs…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} />;

  const { kpis, revenueDaily } = data;
  const cards = [
    {
      key: "revenue",
      label: "Total Revenue",
      value: formatTLCompact(kpis.revenue),
      changePct: kpis.revenueChangePct,
      href: "/sales",
    },
    {
      key: "conversion",
      label: "Conversion Rate",
      value: `%${kpis.conversionRatePct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`,
      changePct: kpis.conversionChangePct,
    },
    {
      key: "roi",
      label: "ROI",
      value: `%${Math.round(kpis.roiPct)}`,
      changePct: kpis.roiChangePct,
    },
    {
      key: "growth",
      label: "Growth Rate",
      value: formatPct(kpis.growthRatePct),
      changePct: kpis.growthRatePct,
      danger: kpis.growthRatePct < 0,
    },
  ];

  const trend = revenueDaily.map((d) => ({
    day: Number(d.date.slice(8, 10)),
    value: Math.round(d.revenue / 1000),
  }));

  return (
    <div className="flex flex-col gap-3.5 p-4">
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => {
          const up = card.changePct >= 0;
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
              <div
                className={`mt-1 flex items-center gap-1 text-[11px] ${up ? "text-mint" : "text-red"}`}
              >
                {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {formatPct(card.changePct)}
                <span className="ml-0.5 text-faint">· prev. period</span>
              </div>
              {card.href && (
                <div className="mt-1.5 text-[10px] text-mint">
                  tap for details →
                </div>
              )}
            </Card>
          );
          return card.href ? (
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
          <span className="text-[13.5px] font-semibold">
            Last 30 Days · Revenue Trend
          </span>
          <span className="text-[11px] text-faint">K ₺ / day</span>
        </div>
        <div className="-mx-2 h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend}
              margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.mint} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART.mint} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: CHART.faint, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: CHART.faint, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART.mint}
                strokeWidth={2}
                fill="url(#trendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
