"use client";

// Stock Status — date/category/status filters, summary strip and product
// cards sorted by stock pressure, with an "Order from Supplier" quick action
// (report §7.2/06). Stock levels are point-in-time (dataset end); the date
// range scopes the movement count in the summary.

import { useState } from "react";
import { AlertTriangle, Truck, UserCog } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { categoryLabel, supplierLabel } from "@/lib/display";
import { formatTL } from "@/lib/format";
import { useToast } from "@/components/AppShell";
import { DateRangeFilter, FilterSelect, useFilters } from "@/components/filters";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SummaryStrip,
} from "@/components/ui";
import type { StockResponse } from "@/types/atlas";

const STATUS_OPTIONS = [
  { value: "all", label: "All Stock" },
  { value: "critical", label: "Critical" },
  { value: "healthy", label: "Healthy" },
];

export default function StockPage() {
  const { from, to } = useFilters();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const { toast } = useToast();

  const query = new URLSearchParams({ from, to });
  if (category !== "all") query.set("category", category);
  if (status !== "all") query.set("status", status);
  const { data, loading, error } = useApi<StockResponse>(
    `/api/stock?${query.toString()}`,
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <DateRangeFilter />

      {data && (
        <div className="flex gap-2">
          <FilterSelect
            label="Category"
            value={category}
            options={[
              { value: "all", label: "All Categories" },
              ...data.facets.categories.map((c) => ({
                value: c,
                label: categoryLabel(c),
              })),
            ]}
            onChange={setCategory}
          />
          <FilterSelect
            label="Stock status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
          />
        </div>
      )}

      {loading && <LoadingState label="Loading stock status…" />}
      {!loading && (error || !data) && <ErrorState message={error ?? "No data"} />}

      {data && (
        <>
          <SummaryStrip
            items={[
              {
                label: "SKUs",
                value: data.summary.totalSkus.toLocaleString("tr-TR"),
                note: "products in selected category",
              },
              {
                label: "Critical",
                value: String(data.summary.criticalCount),
                note: "below critical threshold (rule R2)",
              },
              {
                label: "Fill Rate",
                value: `%${data.summary.fillRatePct.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`,
                note: `${data.summary.movementsInRange.toLocaleString("tr-TR")} movements in selected range`,
              },
            ]}
          />

          {data.summary.criticalCount > 0 && status !== "healthy" && (
            <Card className="border-red/30 bg-red/8 p-3.5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-red" />
                <div>
                  <div className="text-[13.5px] font-semibold">
                    {data.summary.criticalCount} products below the critical threshold
                  </div>
                  <div className="text-[11.5px] text-sub">
                    Immediate reorder recommended
                  </div>
                </div>
              </div>
            </Card>
          )}

          {data.products.length === 0 && <EmptyState message="No products match the filters." />}

          {data.products.map((p) => {
            const critical = p.stockLevel < p.criticalStock;
            const ratio = Math.min(p.stockLevel / p.criticalStock, 1.5);
            return (
              <Card key={p.productId} className={`p-3.5 ${critical ? "border-red/30" : ""}`}>
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-faint">
                      {p.productId} · {categoryLabel(p.category)} ·{" "}
                      {supplierLabel(p.supplier)}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-faint">
                      #{p.categoryRank} in {categoryLabel(p.category)} by units
                      sold
                    </div>
                  </div>
                  <div className="font-display text-[13px] font-semibold whitespace-nowrap">
                    {formatTL(p.price)}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 rounded-full bg-panel2">
                    <div
                      className={`h-full rounded-full ${critical ? "bg-red" : "bg-mint"}`}
                      style={{ width: `${(ratio / 1.5) * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-[11.5px] font-semibold ${critical ? "text-red" : "text-sub"}`}
                  >
                    {p.stockLevel}/{p.criticalStock} (
                    {Math.round((p.stockLevel / p.criticalStock) * 100)}%)
                  </span>
                </div>
                {critical && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        toast(
                          `✓ Order placed with ${supplierLabel(p.supplier)} for ${p.name}`,
                        )
                      }
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-mint py-2 text-[11.5px] font-semibold text-on-accent"
                    >
                      <Truck size={13} /> Order from Supplier
                    </button>
                    <button
                      onClick={() =>
                        toast(`✓ Inventory manager notified about ${p.name}`)
                      }
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line py-2 text-[11.5px] font-semibold"
                    >
                      <UserCog size={13} /> Notify Inventory Manager
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
