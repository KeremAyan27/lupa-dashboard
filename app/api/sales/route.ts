// GET /api/sales?from&to&category&channel → monthly revenue (with anomaly
// labels from the alert engine), category distribution, city ranking and a
// summary of the filtered slice.
//
// When a category filter is active, revenue is the sum of matching item
// subtotals (an order can span categories); otherwise order totals are used.

import { NextRequest, NextResponse } from "next/server";
import { detectRevenueAnomalies } from "@/lib/alert-engine";
import { getOrders, getProducts } from "@/lib/data";
import { normalizeRange } from "@/lib/date-range";
import { buildSeries, granularityFor } from "@/lib/series";
import type {
  CategoryShare,
  CityRevenue,
  Order,
  SalesResponse,
} from "@/types/atlas";

const TOP_CITIES = 5;

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const { from, to } = normalizeRange(params.get("from"), params.get("to"));
    const category = params.get("category") || null;
    const channel = params.get("channel") || null;

    const [orders, products] = await Promise.all([getOrders(), getProducts()]);
    const categoryById = new Map(products.map((p) => [p.productId, p.category]));

    const delivered = orders.filter(
      (o) =>
        o.status === "delivered" &&
        o.orderDate >= from &&
        o.orderDate <= to &&
        (!channel || o.channel === channel),
    );

    // Revenue contribution of one order under the active category filter.
    const orderRevenue = (o: Order): number =>
      category
        ? o.items
            .filter((it) => categoryById.get(it.productId) === category)
            .reduce((s, it) => s + it.subtotal, 0)
        : o.totalAmount;

    // Revenue series at the range-derived granularity. R1 anomaly labels
    // (engine runs on the full dataset so labels stay consistent with the
    // Alert Center) attach only at monthly granularity.
    const granularity = granularityFor({ from, to });
    const anomalyByMonth = new Map(
      detectRevenueAnomalies(orders).map((a) => [a.date.slice(0, 7), a]),
    );
    const series = buildSeries(
      delivered.map((o) => ({ date: o.orderDate, revenue: orderRevenue(o) })),
      { from, to },
      granularity,
      anomalyByMonth,
    );

    // Category distribution (range/channel filtered; not category filtered,
    // so the pie always shows where the filtered revenue sits).
    const byCategory = new Map<string, number>();
    for (const o of delivered)
      for (const it of o.items) {
        const cat = categoryById.get(it.productId) ?? "Other";
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + it.subtotal);
      }
    const grandTotal = [...byCategory.values()].reduce((s, v) => s + v, 0);
    const categories: CategoryShare[] = [...byCategory.entries()]
      .map(([name, revenue]) => ({
        name,
        revenue: Math.round(revenue),
        sharePct: grandTotal > 0 ? Math.round((revenue / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // City ranking under all active filters
    const byCity = new Map<string, number>();
    for (const o of delivered) {
      const value = orderRevenue(o);
      if (value > 0) byCity.set(o.city, (byCity.get(o.city) ?? 0) + value);
    }
    const ranked = [...byCity.entries()].sort((a, b) => b[1] - a[1]);
    const cities: CityRevenue[] = ranked
      .slice(0, TOP_CITIES)
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue), cityCount: 1 }));
    const rest = ranked.slice(TOP_CITIES);
    if (rest.length > 0)
      cities.push({
        name: `Other (${rest.length} cities)`,
        revenue: Math.round(rest.reduce((s, [, v]) => s + v, 0)),
        cityCount: rest.length,
      });

    // Summary of the filtered slice
    const contributing = delivered.filter((o) => orderRevenue(o) > 0);
    const revenue = contributing.reduce((s, o) => s + orderRevenue(o), 0);

    const body: SalesResponse = {
      series,
      granularity,
      categories,
      cities,
      summary: {
        revenue: Math.round(revenue),
        orders: contributing.length,
        avgOrderValue: contributing.length > 0 ? revenue / contributing.length : 0,
      },
      facets: {
        categories: [...new Set(products.map((p) => p.category))].sort(),
        channels: [...new Set(orders.map((o) => o.channel))].sort(),
      },
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to compute sales analytics" },
      { status: 500 },
    );
  }
}
