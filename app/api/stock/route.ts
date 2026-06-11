// GET /api/stock → product catalog sorted by stock pressure
// (stockLevel / criticalStock ascending), with the critical count.

import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import type { StockResponse } from "@/types/atlas";

export async function GET() {
  try {
    const products = await getProducts();
    const sorted = [...products].sort(
      (a, b) => a.stockLevel / a.criticalStock - b.stockLevel / b.criticalStock,
    );
    const body: StockResponse = {
      criticalCount: products.filter((p) => p.stockLevel < p.criticalStock)
        .length,
      products: sorted,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to load stock data" },
      { status: 500 },
    );
  }
}
