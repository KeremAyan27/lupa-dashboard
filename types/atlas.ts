// Data model for the Atlas CEO Dashboard.
// Field names mirror the JSON files in /data exactly (see the project data
// dictionary); the JSON files are generated from the reference workbook and
// must never be edited by hand.

export type OrderStatus =
  | "delivered"
  | "shipped"
  | "processing"
  | "cancelled"
  | "returned";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  currency: "TL";
  channel: string;
  city: string;
  items: OrderItem[];
}

export interface Product {
  productId: string;
  name: string;
  category: string;
  price: number;
  currency: "TL";
  stockLevel: number;
  criticalStock: number;
  supplier: string;
  isStockCritical: boolean;
}

export type CustomerSegment = "VIP" | "Normal";

export interface Customer {
  customerId: string;
  name: string;
  email: string;
  city: string;
  segment: CustomerSegment;
  /** ISO 8601 timestamp */
  registerDate: string;
  totalSpent: number;
}

export type PaymentStatus = "paid" | "pending" | "overdue";

export interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: "TL";
  status: PaymentStatus;
  /** Payment method label as stored in the dataset (Turkish, e.g. "Kredi Kartı") */
  method: string;
  /** ISO 8601 date; null while unpaid */
  paidDate: string | null;
  /** ISO 8601 date (order date + 30 days) */
  dueDate: string;
}

export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement {
  movementId: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  /** ISO 8601 date */
  date: string;
  reason: string;
}

export type AlertSeverity = "high" | "medium" | "low" | "info";

export type AlertType =
  | "revenue_drop"
  | "revenue_spike"
  | "stock_critical"
  | "payment_overdue"
  | "campaign_success"
  | "segment_growth"
  | "friction_detected";

/** Static alert record as stored in data/alerts.json (reference only;
 *  the UI consumes alerts produced by lib/alert-engine instead). */
export interface StoredAlert {
  alertId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  relatedType: string | null;
  relatedId: string | null;
}

/** Alert produced by the rule-based engine (lib/alert-engine.ts). */
export interface EngineAlert {
  id: string;
  rule: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Compact one-line metric for inline lists, e.g. "−39.5% vs Feb",
   *  "19 units remaining", "12 invoices overdue" */
  summary: string;
  /** Primary entity name when the alert is about one record (product name for
   *  stock alerts); null for portfolio-level alerts. Surfaced as the row title
   *  in compact views. May be a Turkish product name. */
  subject: string | null;
  /** ISO 8601 date the alert refers to */
  date: string;
  /** How the rule detected the anomaly (shown as "Automatic Detection Note") */
  detectionNote: string;
  /** Which records/values are affected (shown as "Affected Context") */
  affectedContext: string;
  /** Suggested next step (shown as "Recommended Action") */
  recommendedAction: string;
  /** Labels for Quick Action buttons */
  quickActions: string[];
}

/* ---------- API response shapes ---------- */

/** Change values are null when the comparison window falls outside the dataset. */
export interface KpiSet {
  revenue: number;
  revenueChangePct: number | null;
  conversionRatePct: number;
  conversionChangePct: number | null;
  roiPct: number;
  roiChangePct: number | null;
  growthRatePct: number | null;
}

export type ChartGranularity = "daily" | "weekly" | "monthly";

/** One bucket of a revenue time series at the chosen granularity. */
export interface SeriesPoint {
  /** Sort/group key: ISO date, zero-padded week key, or YYYY-MM */
  key: string;
  /** Axis label: "05.12", "Week 2", "Mar" */
  label: string;
  revenue: number;
  /** Change vs previous bucket; null for the first or after an empty bucket */
  changePct: number | null;
  /** R1 alert for this bucket — only ever set at monthly granularity */
  anomaly: EngineAlert | null;
}

/** Engine anomaly projected onto a time-series chart. */
export interface TrendAnomaly {
  /** Engine alert id (e.g. "R1-2025-03") — the navigation target */
  id: string;
  /** First day of the anomalous month */
  date: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
}

export interface OverviewSummary {
  orders: number;
  delivered: number;
  avgOrderValue: number;
}

export interface OverviewResponse {
  kpis: KpiSet;
  /** Delivered revenue bucketed to the range-derived granularity */
  trend: SeriesPoint[];
  granularity: ChartGranularity;
  /** R1 anomalies whose month falls inside the selected range (any granularity) */
  anomalies: TrendAnomaly[];
  summary: OverviewSummary;
  range: { from: string; to: string };
  /** Reference "today" used for all relative calculations */
  referenceDate: string;
}

export interface CategoryShare {
  name: string;
  revenue: number;
  sharePct: number;
}

export interface CityRevenue {
  name: string;
  revenue: number;
  cityCount: number;
}

export interface SalesSummary {
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

export interface SalesResponse {
  series: SeriesPoint[];
  granularity: ChartGranularity;
  categories: CategoryShare[];
  cities: CityRevenue[];
  summary: SalesSummary;
  facets: { categories: string[]; channels: string[] };
}

/** Product enriched with sales standing inside its category. */
export interface RankedProduct extends Product {
  /** Units sold across delivered orders */
  unitsSold: number;
  /** 1-based rank within the product's category (units, ties by revenue) */
  categoryRank: number;
}

export interface StockSummary {
  totalSkus: number;
  criticalCount: number;
  /** Share of (category-filtered) products at or above their critical threshold */
  fillRatePct: number;
  /** Stock movements within the selected date range */
  movementsInRange: number;
}

export interface StockResponse {
  products: RankedProduct[];
  summary: StockSummary;
  facets: { categories: string[] };
}

export interface ListedPayment extends Payment {
  customerName: string;
  /** Source customer id; used for the privacy-safe display label */
  customerId: string;
  /** Days past dueDate; null unless the payment is overdue */
  daysOverdue: number | null;
}

export interface PaymentStatusTotal {
  amount: number;
  count: number;
}

export interface PaymentsResponse {
  summary: {
    paid: PaymentStatusTotal;
    pending: PaymentStatusTotal;
    overdue: PaymentStatusTotal;
  };
  payments: ListedPayment[];
  /** payments[] is capped; matchingCount is the uncapped total */
  matchingCount: number;
  referenceDate: string;
}

export interface AlertsResponse {
  alerts: EngineAlert[];
}
