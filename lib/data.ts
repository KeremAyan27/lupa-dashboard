// Server-side data access layer.
// Reads the generated JSON files in /data once per server process and caches
// them in module scope. The JSON files are reproducible artifacts
// (random.seed(42)) and are treated as read-only.

import { promises as fs } from "fs";
import path from "path";
import type {
  Customer,
  Order,
  Payment,
  Product,
  StockMovement,
  StoredAlert,
} from "@/types/atlas";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * All "today"-relative logic (days overdue, trends, filter presets) is
 * anchored to the end of the dataset so the dashboard is stable and
 * demonstrable regardless of the real clock. See lib/date-range.ts.
 */
export { REFERENCE_DATE } from "./date-range";

const cache = new Map<string, unknown>();

async function readJson<T>(file: string): Promise<T> {
  const cached = cache.get(file);
  if (cached) return cached as T;
  const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
  const parsed = JSON.parse(raw) as T;
  cache.set(file, parsed);
  return parsed;
}

export const getOrders = () => readJson<Order[]>("orders.json");

export interface ProductSales {
  units: number;
  revenue: number;
}

/** Units and revenue per product across delivered orders, computed once per
 *  server process (same lifetime as the file cache above). */
export async function getProductSales(): Promise<Map<string, ProductSales>> {
  const cached = cache.get("computed:productSales");
  if (cached) return cached as Map<string, ProductSales>;
  const orders = await getOrders();
  const stats = new Map<string, ProductSales>();
  for (const order of orders) {
    if (order.status !== "delivered") continue;
    for (const item of order.items) {
      const entry = stats.get(item.productId) ?? { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.subtotal;
      stats.set(item.productId, entry);
    }
  }
  cache.set("computed:productSales", stats);
  return stats;
}
export const getProducts = () => readJson<Product[]>("products.json");
export const getCustomers = () => readJson<Customer[]>("customers.json");
export const getPayments = () => readJson<Payment[]>("payments.json");
export const getStockMovements = () =>
  readJson<StockMovement[]>("stockMovements.json");
export const getStoredAlerts = () => readJson<StoredAlert[]>("alerts.json");

/** Days between two ISO dates (b − a), ignoring time of day. */
export function daysBetween(a: string, b: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round(
    (Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / MS_PER_DAY,
  );
}

/** Sum of delivered order revenue grouped by month key ("2025-01" … "2025-12"). */
export function monthlyDeliveredRevenue(orders: Order[]): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "delivered") continue;
    const month = order.orderDate.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + order.totalAmount);
  }
  return new Map([...byMonth.entries()].sort());
}
