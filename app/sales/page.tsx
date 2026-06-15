"use client";

// Sales Analytics — global date filter + category/channel filters, summary
// strip, monthly revenue with tap-to-focus and anomaly labels, category pie
// and city ranking (report §7.2/03-05).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/use-api";
import { categoryLabel } from "@/lib/display";
import { formatTLCompact } from "@/lib/format";
import { AnomalyDot } from "@/components/AnomalyDot";
import { useTheme } from "@/components/theme";
import { DateRangeFilter, FilterSelect, useFilters } from "@/components/filters";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SEVERITY,
  SummaryStrip,
} from "@/components/ui";
import type { SalesResponse } from "@/types/atlas";

export default function SalesPage() {
  const { from, to } = useFilters();
  const [category, setCategory] = useState("all");
  const [channel, setChannel] = useState("all");
  const [selected, setSelected] = useState(0); // tap-to-focus index
  const { chart } = useTheme();
  const PIE_COLORS = [chart.mint, chart.blue, chart.violet, chart.amber, chart.faint];

  const query = new URLSearchParams({ from, to });
  if (category !== "all") query.set("category", category);
  if (channel !== "all") query.set("channel", channel);
  const { data, loading, error } = useApi<SalesResponse>(
    `/api/sales?${query.toString()}`,
  );

  // Monthly buckets chart in M ₺, daily/weekly in K ₺
  const divisor = data?.granularity === "monthly" ? 1_000_000 : 1_000;
  const series = useMemo(
    () =>
      (data?.series ?? []).map((m) => ({
        ...m,
        value: m.revenue / divisor,
      })),
    [data, divisor],
  );

  const facetOptions = (values: string[], allLabel: string) => [
    { value: "all", label: allLabel },
    ...values.map((v) => ({ value: v, label: categoryLabel(v) })),
  ];

  return (
    <div className="flex flex-col gap-3.5 p-4">
      <DateRangeFilter />

      {data && (
        <div className="flex gap-2">
          <FilterSelect
            label="Category"
            value={category}
            options={facetOptions(data.facets.categories, "All Categories")}
            onChange={(v) => {
              setCategory(v);
              setSelected(0);
            }}
          />
          <FilterSelect
            label="Channel"
            value={channel}
            options={facetOptions(data.facets.channels, "All Channels")}
            onChange={(v) => {
              setChannel(v);
              setSelected(0);
            }}
          />
        </div>
      )}

      {loading && <LoadingState label="Loading sales analytics…" />}
      {!loading && (error || !data) && <ErrorState message={error ?? "No data"} />}

      {data && series.length === 0 && <EmptyState />}

      {data && series.length > 0 && (
        <>
          <SummaryStrip
            items={[
              {
                label: "Revenue",
                value: formatTLCompact(data.summary.revenue),
                note: "delivered revenue in selected range",
              },
              {
                label: "Orders",
                value: data.summary.orders.toLocaleString("tr-TR"),
                note: `${data.summary.orders.toLocaleString("tr-TR")} delivered orders match the filters`,
              },
              {
                label: "Avg Order",
                value: formatTLCompact(data.summary.avgOrderValue),
                note: "revenue ÷ filtered orders",
              },
            ]}
          />

          <RevenueChart
            series={series}
            granularity={data.granularity}
            selected={Math.min(selected, series.length - 1)}
            onSelect={setSelected}
            chart={chart}
          />

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
                    <span className="flex-1 text-sub">{categoryLabel(c.name)}</span>
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
        </>
      )}
    </div>
  );
}

type ChartPoint = SalesResponse["series"][number] & { value: number };

const BUCKET_NOUN: Record<SalesResponse["granularity"], string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

function RevenueChart({
  series,
  granularity,
  selected,
  onSelect,
  chart,
}: {
  series: ChartPoint[];
  granularity: SalesResponse["granularity"];
  selected: number;
  onSelect: (i: number) => void;
  chart: ReturnType<typeof useTheme>["chart"];
}) {
  const router = useRouter();
  const point = series[selected];
  const anomaly = point.anomaly;
  const tickInterval = series.length > 12 ? Math.floor(series.length / 12) : 0;

  return (
    <Card className="p-4">
      <div className="mb-1 flex justify-between">
        <span className="text-[13.5px] font-semibold">
          {granularity === "daily" ? "Daily" : granularity === "weekly" ? "Weekly" : "Monthly"}{" "}
          Revenue
        </span>
        {series.length >= 2 && (
          <span className="text-[10.5px] text-faint">
            👆 tap a {BUCKET_NOUN[granularity]}
          </span>
        )}
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
            data={series}
            onClick={(state) => {
              // Recharts 3.x reports the index as a string
              const i = Number(state?.activeTooltipIndex);
              if (Number.isInteger(i) && i >= 0) onSelect(i);
            }}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={chart.line} vertical={false} />
            {/* hidden tooltip: enables tap/click month tracking on mobile */}
            <Tooltip content={() => null} cursor={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: chart.faint, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fill: chart.faint, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
              tickFormatter={(v: number) =>
                granularity === "monthly" ? v.toFixed(1) : String(Math.round(v))
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chart.mint}
              strokeWidth={2.4}
              dot={{ r: 2.5, fill: chart.bg, stroke: chart.mint, strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: chart.mint }}
            />
            <ReferenceDot
              x={point.label}
              y={point.value}
              r={6}
              fill={chart.text}
              stroke={chart.mint}
              strokeWidth={2}
            />
            {series.flatMap((m) => {
              const al = m.anomaly;
              if (!al) return [];
              return [
                <ReferenceDot
                  key={m.key}
                  x={m.label}
                  y={m.value}
                  shape={(props) => (
                    <AnomalyDot
                      cx={props.cx}
                      cy={props.cy}
                      color={al.type === "revenue_drop" ? chart.red : chart.amber}
                      bg={chart.bg}
                      label={al.title}
                      onSelect={() => router.push(`/alerts/${al.id}`)}
                    />
                  )}
                />,
              ];
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {granularity !== "monthly" ? null : anomaly ? (
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
        <div className="text-[11.5px] text-faint">No anomaly for this month.</div>
      )}
    </Card>
  );
}
