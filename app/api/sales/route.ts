// GET /api/sales?range=3|6|12 → monthly revenue (with anomaly labels from the
// alert engine), category distribution and city ranking.

import { NextRequest, NextResponse } from "next/server";
import { detectRevenueAnomalies } from "@/lib/alert-engine";
import { monthLabel } from "@/lib/alert-engine";
import { getOrders, getProducts, monthlyDeliveredRevenue } from "@/lib/data";
import type {
  CategoryShare,
  CityRevenue,
  MonthlyRevenuePoint,
  SalesResponse,
} from "@/types/atlas";

const TOP_CITIES = 5;

export async function GET(req: NextRequest) {
  try {
    const range = Math.min(
      Math.max(Number(req.nextUrl.searchParams.get("range") ?? 12) || 12, 1),
      12,
    );
    const [orders, products] = await Promise.all([getOrders(), getProducts()]);
    const delivered = orders.filter((o) => o.status === "delivered");

    // Monthly revenue + rule R1 anomaly labels
    const anomalies = detectRevenueAnomalies(orders);
    const entries = [...monthlyDeliveredRevenue(orders).entries()];
    const months: MonthlyRevenuePoint[] = entries
      .map(([month, revenue], i) => ({
        month,
        label: monthLabel(month),
        revenue: Math.round(revenue),
        changePct:
          i > 0
            ? ((revenue - entries[i - 1][1]) / entries[i - 1][1]) * 100
            : null,
        anomaly: anomalies.find((a) => a.id === `R1-${month}`) ?? null,
      }))
      .slice(-range);

    // Category distribution (order items joined to the product catalog)
    const categoryById = new Map(products.map((p) => [p.productId, p.category]));
    const byCategory = new Map<string, number>();
    for (const order of delivered)
      for (const item of order.items) {
        const category = categoryById.get(item.productId) ?? "Other";
        byCategory.set(category, (byCategory.get(category) ?? 0) + item.subtotal);
      }
    const grandTotal = [...byCategory.values()].reduce((s, v) => s + v, 0);
    const categories: CategoryShare[] = [...byCategory.entries()]
      .map(([name, revenue]) => ({
        name,
        revenue: Math.round(revenue),
        sharePct: Math.round((revenue / grandTotal) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // City ranking (top cities + the rest aggregated)
    const byCity = new Map<string, number>();
    for (const order of delivered)
      byCity.set(order.city, (byCity.get(order.city) ?? 0) + order.totalAmount);
    const ranked = [...byCity.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, TOP_CITIES);
    const rest = ranked.slice(TOP_CITIES);
    const cities: CityRevenue[] = top.map(([name, revenue]) => ({
      name,
      revenue: Math.round(revenue),
      cityCount: 1,
    }));
    if (rest.length > 0)
      cities.push({
        name: `Other (${rest.length} cities)`,
        revenue: Math.round(rest.reduce((s, [, v]) => s + v, 0)),
        cityCount: rest.length,
      });

    const body: SalesResponse = { months, categories, cities };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to compute sales analytics" },
      { status: 500 },
    );
  }
}
