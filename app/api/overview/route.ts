// GET /api/overview → 4 KPI cards + last-30-days revenue trend.
// KPI formulas follow report §4.3; sessions and marketing cost are assumed
// analytics inputs (no live analytics source in this proof of concept).

import { NextResponse } from "next/server";
import { daysBetween, getOrders, monthlyDeliveredRevenue, REFERENCE_DATE } from "@/lib/data";
import type { DailyRevenuePoint, OverviewResponse } from "@/types/atlas";

const ASSUMED = {
  sessions: 121_000, // yearly visitor sessions (analytics assumption)
  marketingCost: 22_500_000, // yearly marketing spend in ₺ (assumption)
};

export async function GET() {
  try {
    const orders = await getOrders();
    const delivered = orders.filter((o) => o.status === "delivered");

    // Total Revenue = Σ totalAmount over delivered orders
    const revenue = delivered.reduce((sum, o) => sum + o.totalAmount, 0);

    // Conversion Rate = delivered orders / sessions
    const conversionRatePct = (delivered.length / ASSUMED.sessions) * 100;

    // ROI = (revenue − marketing cost) / marketing cost
    const roiPct =
      ((revenue - ASSUMED.marketingCost) / ASSUMED.marketingCost) * 100;

    // Growth Rate = last month vs previous month
    const months = [...monthlyDeliveredRevenue(orders).values()];
    const [prev, last] = months.slice(-2);
    const growthRatePct = ((last - prev) / prev) * 100;

    // Last 30 days vs the 30 days before → change badge on the revenue card
    const inWindow = (o: { orderDate: string }, from: number, to: number) => {
      const age = daysBetween(o.orderDate, REFERENCE_DATE);
      return age >= from && age < to;
    };
    const last30 = delivered.filter((o) => inWindow(o, 0, 30));
    const prev30 = delivered.filter((o) => inWindow(o, 30, 60));
    const sum = (list: typeof delivered) =>
      list.reduce((s, o) => s + o.totalAmount, 0);
    const revenueChangePct = ((sum(last30) - sum(prev30)) / sum(prev30)) * 100;

    // Daily revenue for the trend chart (last 30 days of the dataset)
    const byDay = new Map<string, number>();
    for (const o of last30)
      byDay.set(o.orderDate, (byDay.get(o.orderDate) ?? 0) + o.totalAmount);
    const revenueDaily: DailyRevenuePoint[] = [...byDay.entries()]
      .sort()
      .map(([date, value]) => ({ date, revenue: Math.round(value) }));

    const body: OverviewResponse = {
      kpis: {
        revenue,
        revenueChangePct,
        conversionRatePct,
        // No per-period session data in the mock set; change badges for the
        // assumption-based KPIs mirror the revenue trend direction.
        conversionChangePct: revenueChangePct / 10,
        roiPct,
        roiChangePct: revenueChangePct / 2,
        growthRatePct,
      },
      revenueDaily,
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
