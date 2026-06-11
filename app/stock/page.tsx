"use client";

// Stock Status — critical stock summary + product cards sorted by stock
// pressure, with an "Order from Supplier" quick action (report §7.2/06).

import { AlertTriangle, Truck } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatTL } from "@/lib/format";
import { useToast } from "@/components/AppShell";
import { Card, ErrorState, LoadingState } from "@/components/ui";
import type { StockResponse } from "@/types/atlas";

export default function StockPage() {
  const { data, loading, error } = useApi<StockResponse>("/api/stock");
  const { toast } = useToast();

  if (loading) return <LoadingState label="Loading stock status…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} />;

  return (
    <div className="flex flex-col gap-3 p-4">
      <Card className="border-red/30 bg-red/8 p-3.5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={18} className="shrink-0 text-red" />
          <div>
            <div className="text-[13.5px] font-semibold">
              {data.criticalCount} products below the critical threshold
            </div>
            <div className="text-[11.5px] text-sub">
              Immediate reorder recommended
            </div>
          </div>
        </div>
      </Card>

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
                  {p.productId} · {p.category} · {p.supplier}
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
                {p.stockLevel}/{p.criticalStock}
              </span>
            </div>
            {critical && (
              <button
                onClick={() =>
                  toast(`✓ Order placed with ${p.supplier} for ${p.name}`)
                }
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[11px] bg-mint py-2.5 text-xs font-semibold text-bg"
              >
                <Truck size={14} /> Order from Supplier
              </button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
