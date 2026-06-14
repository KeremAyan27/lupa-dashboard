"use client";

// Active Alerts — inline overview summary of the top rule-engine alerts so the
// CEO sees them without opening the bell drawer. Data comes from /api/alerts
// (via the shared AlertsContext); rows are filtered to the active date range
// and tapping one opens the existing /alerts/[id] detail.

import Link from "next/link";
import { Clock, Package, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAlerts } from "@/components/AppShell";
import { useFilters } from "@/components/filters";
import { Card, SEVERITY } from "@/components/ui";
import type { EngineAlert } from "@/types/atlas";

const TOP_N = 3;

function iconFor(alert: EngineAlert): LucideIcon {
  switch (alert.type) {
    case "stock_critical":
      return Package;
    case "payment_overdue":
      return Clock;
    case "revenue_spike":
      return TrendingUp;
    default:
      return TrendingDown; // revenue_drop and other portfolio alerts
  }
}

export function ActiveAlerts() {
  const { alerts, loading, readIds, openDrawer } = useAlerts();
  const { from, to } = useFilters();

  // Only alerts relevant to the selected range (engine already sorts them by
  // severity, highest first, so the slice keeps that order).
  const relevant = alerts.filter((a) => a.date >= from && a.date <= to);
  const unread = relevant.filter((a) => !readIds.has(a.id)).length;
  const top = relevant.slice(0, TOP_N);

  return (
    <Card className="p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold">Active Alerts</span>
          {unread > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>
        {relevant.length > 0 && (
          <button
            onClick={openDrawer}
            className="cursor-pointer text-[11px] font-semibold text-mint"
          >
            See all →
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-[11.5px] text-sub">
          Running alert engine…
        </div>
      ) : top.length === 0 ? (
        <div className="py-4 text-center text-[11.5px] text-sub">
          No active alerts in the selected range.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {top.map((alert) => {
            const s = SEVERITY[alert.severity];
            const Icon = iconFor(alert);
            const read = readIds.has(alert.id);
            return (
              <Link
                key={alert.id}
                href={`/alerts/${alert.id}`}
                className={`flex items-center gap-2.5 rounded-[12px] border p-2.5 ${
                  read ? "border-line opacity-70" : s.border
                }`}
              >
                <span
                  className={`flex size-[30px] shrink-0 items-center justify-center rounded-[9px] ${s.chipBg} ${s.text}`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
                  {alert.subject ?? alert.title}
                </span>
                <span className={`shrink-0 text-[11px] font-semibold ${s.text}`}>
                  {alert.summary}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
