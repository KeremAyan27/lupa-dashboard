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

export interface KpiSet {
  revenue: number;
  revenueChangePct: number;
  conversionRatePct: number;
  conversionChangePct: number;
  roiPct: number;
  roiChangePct: number;
  growthRatePct: number;
}

export interface DailyRevenuePoint {
  /** ISO 8601 date */
  date: string;
  revenue: number;
}

export interface OverviewResponse {
  kpis: KpiSet;
  /** Daily revenue for the last 30 days of the dataset */
  revenueDaily: DailyRevenuePoint[];
  /** Reference "today" used for all relative calculations */
  referenceDate: string;
}

export interface MonthlyRevenuePoint {
  /** Month key, e.g. "2025-03" */
  month: string;
  /** Short month label, e.g. "Mar" */
  label: string;
  revenue: number;
  /** Change vs previous month; null for the first month of the dataset */
  changePct: number | null;
  /** Alert raised by the revenue rule for this month, if any */
  anomaly: EngineAlert | null;
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

export interface SalesResponse {
  months: MonthlyRevenuePoint[];
  categories: CategoryShare[];
  cities: CityRevenue[];
}

export interface StockResponse {
  criticalCount: number;
  products: Product[];
}

export interface OverduePayment extends Payment {
  customerName: string;
  daysOverdue: number;
}

export interface PaymentsResponse {
  totals: { paid: number; pending: number; overdue: number };
  overdueAmount: number;
  overduePayments: OverduePayment[];
  referenceDate: string;
}

export interface AlertsResponse {
  alerts: EngineAlert[];
}
