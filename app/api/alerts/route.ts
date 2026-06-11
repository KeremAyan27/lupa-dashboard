// GET /api/alerts → alerts produced by the rule-based engine
// (lib/alert-engine.ts). The static data/alerts.json is kept only as a
// dataset artifact; the UI consumes this derived list.

import { NextResponse } from "next/server";
import { runAlertEngine } from "@/lib/alert-engine";
import { getOrders, getPayments, getProducts } from "@/lib/data";
import type { AlertsResponse } from "@/types/atlas";

export async function GET() {
  try {
    const [orders, products, payments] = await Promise.all([
      getOrders(),
      getProducts(),
      getPayments(),
    ]);
    const body: AlertsResponse = {
      alerts: runAlertEngine(orders, products, payments),
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to run alert engine" },
      { status: 500 },
    );
  }
}
