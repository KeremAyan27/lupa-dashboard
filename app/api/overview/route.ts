// GET /api/overview?from&to → KPI cards, daily revenue trend and summary for
// the selected date range. KPI formulas follow report §4.3; sessions and
// marketing cost are yearly analytics assumptions prorated to the range.

import { NextRequest, NextResponse } from "next/server";
import { detectRevenueAnomalies } from "@/lib/alert-engine";
import { getOrders, monthlyDeliveredRevenue, REFERENCE_DATE } from "@/lib/data";
import {
  addDaysIso,
  DATASET_START,
  normalizeRange,
  rangeDays,
} from "@/lib/date-range";
import { buildSeries, granularityFor } from "@/lib/series";
import type { Order, OverviewResponse, TrendAnomaly } from "@/types/atlas";

const ASSUMED = {
  sessions: 121_000, // yearly visitor sessions (analytics assumption)
  marketingCost: 22_500_000, // yearly marketing spend in ₺ (assumption)
};

const inRange = (o: Order, from: string, to: string) =>
  o.orderDate >= from && o.orderDate <= to;

const revenueOf = (orders: Order[]) =>
  orders.reduce((sum, o) => sum + o.totalAmount, 0);

export async function GET(req: NextRequest) {
  try {
    const { from, to } = normalizeRange(
      req.nextUrl.searchParams.get("from"),
      req.nextUrl.searchParams.get("to"),
    );
    const orders = await getOrders();
    const all = orders.filter((o) => inRange(o, from, to));
    const delivered = all.filter((o) => o.status === "delivered");

    // Total Revenue = Σ totalAmount over delivered orders in range
    const revenue = revenueOf(delivered);
    const days = rangeDays({ from, to });

    // Conversion Rate / ROI: yearly assumptions prorated to the range length
    const sessions = (ASSUMED.sessions * days) / 365;
    const marketingCost = (ASSUMED.marketingCost * days) / 365;
    const conversionRatePct = (delivered.length / sessions) * 100;
    const roiPct = ((revenue - marketingCost) / marketingCost) * 100;

    // Change badges: this window vs the preceding window of equal length
    // (null when the preceding window leaves the dataset).
    const prevFrom = addDaysIso(from, -days);
    const prevTo = addDaysIso(from, -1);
    let revenueChangePct: number | null = null;
    if (prevFrom >= DATASET_START) {
      const prevRevenue = revenueOf(
        orders.filter((o) => o.status === "delivered" && inRange(o, prevFrom, prevTo)),
      );
      if (prevRevenue > 0)
        revenueChangePct = ((revenue - prevRevenue) / prevRevenue) * 100;
    }

    // Growth Rate = last month vs previous month within the range
    const months = [...monthlyDeliveredRevenue(delivered).values()];
    const growthRatePct =
      months.length >= 2
        ? ((months[months.length - 1] - months[months.length - 2]) /
            months[months.length - 2]) *
          100
        : null;

    // Revenue trend bucketed to the range-derived granularity
    const granularity = granularityFor({ from, to });
    const trend = buildSeries(
      delivered.map((o) => ({ date: o.orderDate, revenue: o.totalAmount })),
      { from, to },
      granularity,
    );

    // R1 anomalies whose month falls inside the range (computed on the full
    // dataset so the labels stay consistent with the Alert Center).
    const anomalies: TrendAnomaly[] = detectRevenueAnomalies(orders)
      .filter((a) => a.date >= from && a.date <= to)
      .map((a) => ({
        id: a.id,
        date: a.date,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
      }));

    const body: OverviewResponse = {
      kpis: {
        revenue,
        revenueChangePct,
        conversionRatePct,
        conversionChangePct: revenueChangePct === null ? null : revenueChangePct / 10,
        roiPct,
        roiChangePct: revenueChangePct === null ? null : revenueChangePct / 2,
        growthRatePct,
      },
      trend,
      granularity,
      anomalies,
      summary: {
        orders: all.length,
        delivered: delivered.length,
        avgOrderValue: delivered.length > 0 ? revenue / delivered.length : 0,
      },
      range: { from, to },
      referenceDate: REFERENCE_DATE,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to compute overview" },
      { status: 500 },
    );
  }
}
