"use client";

// Sales Analytics — monthly revenue with tap-to-focus + anomaly labels,
// time-range filter, category pie and city ranking (report §7.2/03-05).

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/use-api";
import { CHART, formatTLCompact } from "@/lib/format";
import { Card, ErrorState, LoadingState, SEVERITY } from "@/components/ui";
import type { SalesResponse } from "@/types/atlas";

const RANGES = [
  { label: "Last 3 Months", value: 3 },
  { label: "Last 6 Months", value: 6 },
  { label: "12 Months", value: 12 },
] as const;

const PIE_COLORS = [CHART.mint, CHART.blue, CHART.violet, CHART.amber, CHART.faint];

export default function SalesPage() {
  const [range, setRange] = useState<number>(12);
  const [selected, setSelected] = useState(2); // tap-to-focus index
  const { data, loading, error } = useApi<SalesResponse>(
    `/api/sales?range=${range}`,
  );

  const months = useMemo(
    () =>
      (data?.months ?? []).map((m) => ({
        ...m,
        valueM: m.revenue / 1_000_000,
      })),
    [data],
  );

  if (loading) return <LoadingState label="Loading sales analytics…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} />;

  const sel = Math.min(selected, months.length - 1);
  const point = months[sel];
  const anomaly = point.anomaly;

  return (
    <div className="flex flex-col gap-3.5 p-4">
      {/* time-range filter */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => {
              setRange(r.value);
              setSelected(0);
            }}
            className={`flex-1 cursor-pointer rounded-[10px] border py-2 text-xs font-semibold ${
              range === r.value
                ? "border-mint bg-mint text-bg"
                : "border-line text-sub"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* monthly revenue, tap a point to focus */}
      <Card className="p-4">
        <div className="mb-1 flex justify-between">
          <span className="text-[13.5px] font-semibold">Monthly Revenue</span>
          <span className="text-[10.5px] text-faint">tap a month →</span>
        </div>
        <div className="mb-1 flex items-baseline gap-2.5">
          <span className="font-display text-[25px] font-bold">
            {formatTLCompact(point.revenue)}
          </span>
          {point.changePct !== null && (
            <span
              className={`text-[13px] font-semibold ${point.changePct >= 0 ? "text-mint" : "text-red"}`}
            >
              {point.changePct >= 0 ? "+" : ""}
              {point.changePct.toFixed(1)}% · {point.label}
            </span>
          )}
        </div>
        <div className="-mx-1.5 h-[158px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={months}
              onClick={(state) => {
                const i = state?.activeTooltipIndex;
                if (typeof i === "number") setSelected(i);
              }}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART.line} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.faint, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fill: CHART.faint, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={30}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Line
                type="monotone"
                dataKey="valueM"
                stroke={CHART.mint}
                strokeWidth={2.4}
                dot={{ r: 2.5, fill: CHART.bg, stroke: CHART.mint, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: CHART.mint }}
              />
              <ReferenceDot
                x={point.label}
                y={point.valueM}
                r={6}
                fill={CHART.text}
                stroke={CHART.mint}
                strokeWidth={2}
              />
              {months
                .filter((m) => m.anomaly)
                .map((m) => (
                  <ReferenceDot
                    key={m.month}
                    x={m.label}
                    y={m.valueM}
                    r={3.5}
                    fill={m.anomaly?.type === "revenue_drop" ? CHART.red : CHART.amber}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {anomaly ? (
          <div
            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${SEVERITY[anomaly.severity].chipBg}`}
          >
            {anomaly.type === "revenue_drop" ? (
              <TrendingDown size={15} className="text-red" />
            ) : (
              <TrendingUp size={15} className="text-amber" />
            )}
            <span className="text-xs">{anomaly.message}</span>
          </div>
        ) : (
          <div className="text-[11.5px] text-faint">
            No anomaly for this month.
          </div>
        )}
      </Card>

      {/* category distribution */}
      <Card className="p-4">
        <div className="mb-1.5 text-[13.5px] font-semibold">
          Category Distribution
        </div>
        <div className="flex items-center gap-3">
          <div className="size-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="sharePct"
                  nameKey="name"
                  innerRadius={32}
                  outerRadius={56}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.categories.map((c, i) => (
                    <Cell key={c.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            {data.categories.map((c, i) => (
              <div key={c.name} className="mb-1.5 flex items-center gap-2 text-xs">
                <span
                  className="size-[9px] rounded-[3px]"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="flex-1 text-sub">{c.name}</span>
                <span className="font-semibold">%{c.sharePct}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* city ranking */}
      <Card className="p-4">
        <div className="mb-3 text-[13.5px] font-semibold">
          Revenue by City (M ₺)
        </div>
        {data.cities.map((c) => {
          const max = Math.max(...data.cities.map((x) => x.revenue));
          return (
            <div key={c.name} className="mb-2.5">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-sub">{c.name}</span>
                <span className="font-semibold">
                  {(c.revenue / 1_000_000).toLocaleString("tr-TR", {
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-panel2">
                <div
                  className="h-full rounded-full bg-blue"
                  style={{ width: `${(c.revenue / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
