// GET /api/stock?from&to&category&status → product catalog filtered by
// category and stock status, sorted by stock pressure. Stock levels are
// point-in-time (dataset end); the date range only scopes the movement count
// shown in the summary.

import { NextRequest, NextResponse } from "next/server";
import { getProducts, getProductSales, getStockMovements } from "@/lib/data";
import { normalizeRange } from "@/lib/date-range";
import type { RankedProduct, StockResponse } from "@/types/atlas";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const { from, to } = normalizeRange(params.get("from"), params.get("to"));
    const category = params.get("category") || null;
    const status = params.get("status") || "all"; // all | critical | healthy

    const [products, movements, sales] = await Promise.all([
      getProducts(),
      getStockMovements(),
      getProductSales(),
    ]);

    // Sales rank within each category over the full catalog (independent of
    // the active filters): units sold desc, ties broken by revenue desc.
    const rankById = new Map<string, RankedProduct>();
    const byCategory = new Map<string, typeof products>();
    for (const p of products) {
      const group = byCategory.get(p.category) ?? [];
      group.push(p);
      byCategory.set(p.category, group);
    }
    const salesOf = (id: string) => sales.get(id) ?? { units: 0, revenue: 0 };
    for (const group of byCategory.values()) {
      group
        .slice()
        .sort((a, b) => {
          const sa = salesOf(a.productId);
          const sb = salesOf(b.productId);
          return sb.units - sa.units || sb.revenue - sa.revenue;
        })
        .forEach((p, i) => {
          rankById.set(p.productId, {
            ...p,
            unitsSold: salesOf(p.productId).units,
            categoryRank: i + 1,
          });
        });
    }
    const ranked = products.map((p) => rankById.get(p.productId)!);

    const inCategory = ranked.filter(
      (p) => !category || p.category === category,
    );
    const isCritical = (p: (typeof products)[number]) =>
      p.stockLevel < p.criticalStock;

    const filtered = inCategory
      .filter((p) =>
        status === "critical"
          ? isCritical(p)
          : status === "healthy"
            ? !isCritical(p)
            : true,
      )
      .sort(
        (a, b) => a.stockLevel / a.criticalStock - b.stockLevel / b.criticalStock,
      );

    // Summary is computed on the category slice (before the status filter)
    // so SKU count and fill rate stay meaningful while viewing "Critical".
    const criticalCount = inCategory.filter(isCritical).length;
    const productIds = new Set(inCategory.map((p) => p.productId));
    const movementsInRange = movements.filter(
      (m) =>
        m.date.slice(0, 10) >= from &&
        m.date.slice(0, 10) <= to &&
        productIds.has(m.productId),
    ).length;

    const body: StockResponse = {
      products: filtered,
      summary: {
        totalSkus: inCategory.length,
        criticalCount,
        fillRatePct:
          inCategory.length > 0
            ? ((inCategory.length - criticalCount) / inCategory.length) * 100
            : 0,
        movementsInRange,
      },
      facets: {
        categories: [...new Set(products.map((p) => p.category))].sort(),
      },
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to load stock data" },
      { status: 500 },
    );
  }
}
