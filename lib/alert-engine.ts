// Rule-based anomaly detection engine (NOT machine learning).
//
// Every alert shown in the application is derived from the dataset by the
// three threshold rules below. The thresholds are deliberately simple and
// fully transparent so each alert can be traced back to a single comparison:
//
//   R1  REVENUE_CHANGE   |month-over-month revenue change| ≥ 30 %
//   R2  STOCK_CRITICAL   product.stockLevel < product.criticalStock
//   R3  PAYMENT_OVERDUE  payment.status === "overdue" (past dueDate, unpaid)
//
// The engine is pure: same dataset in, same alerts out (the dataset itself is
// reproducible via random.seed(42), so the alert list is reproducible too).

import type {
  EngineAlert,
  Order,
  Payment,
  Product,
} from "@/types/atlas";
import { daysBetween, monthlyDeliveredRevenue, REFERENCE_DATE } from "./data";

/** R1: a month counts as anomalous when |revenue change| reaches ±30 %. */
export const REVENUE_CHANGE_THRESHOLD_PCT = 30;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const fmtTL = (n: number) =>
  `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)} ₺`;

export function monthLabel(monthKey: string): string {
  return MONTH_LABELS[Number(monthKey.slice(5, 7)) - 1];
}

/* ------------------------------------------------------------------ */
/* R1 — monthly revenue change beyond ±30 %                            */
/* ------------------------------------------------------------------ */

export function detectRevenueAnomalies(orders: Order[]): EngineAlert[] {
  const months = [...monthlyDeliveredRevenue(orders).entries()];
  const alerts: EngineAlert[] = [];

  for (let i = 1; i < months.length; i++) {
    const [month, revenue] = months[i];
    const [prevMonth, prevRevenue] = months[i - 1];
    const changePct = ((revenue - prevRevenue) / prevRevenue) * 100;

    // The rule itself: one readable comparison.
    if (Math.abs(changePct) < REVENUE_CHANGE_THRESHOLD_PCT) continue;

    const dropped = changePct < 0;
    const change = `${changePct >= 0 ? "+" : "−"}${Math.abs(changePct).toFixed(1)}%`;
    alerts.push({
      id: `R1-${month}`,
      rule: "R1 REVENUE_CHANGE",
      type: dropped ? "revenue_drop" : "revenue_spike",
      severity: dropped ? "high" : "info",
      title: dropped
        ? `Revenue Drop in ${monthLabel(month)}`
        : `Revenue Recovery in ${monthLabel(month)}`,
      message: `${monthLabel(month)} revenue changed ${change} vs ${monthLabel(prevMonth)} (${fmtTL(revenue)} vs ${fmtTL(prevRevenue)}).`,
      date: `${month}-01`,
      detectionNote:
        `Rule R1: monthly delivered revenue changed by ${change}, ` +
        `beyond the ±${REVENUE_CHANGE_THRESHOLD_PCT}% threshold.`,
      affectedContext: `${monthLabel(month)} 2025 revenue ${fmtTL(revenue)} vs ${monthLabel(prevMonth)} 2025 ${fmtTL(prevRevenue)}.`,
      recommendedAction: dropped
        ? "Review pricing, campaigns and stock availability for the affected month; brief category managers."
        : "Analyse the drivers of the recovery and consider repeating the successful actions.",
      quickActions: dropped
        ? ["Notify Inventory Manager", "Share Report"]
        : ["Share Report"],
    });
  }
  return alerts;
}

/* ------------------------------------------------------------------ */
/* R2 — stock below the critical threshold                             */
/* ------------------------------------------------------------------ */

export function detectCriticalStock(products: Product[]): EngineAlert[] {
  return products
    .filter((p) => p.stockLevel < p.criticalStock) // the rule itself
    .sort((a, b) => a.stockLevel / a.criticalStock - b.stockLevel / b.criticalStock)
    .map((p) => ({
      id: `R2-${p.productId}`,
      rule: "R2 STOCK_CRITICAL",
      type: "stock_critical" as const,
      severity: "medium" as const,
      title: "Critical Stock Level",
      message: `${p.name} is below its critical stock threshold (${p.stockLevel}/${p.criticalStock}).`,
      date: REFERENCE_DATE,
      detectionNote: `Rule R2: stockLevel (${p.stockLevel}) < criticalStock (${p.criticalStock}).`,
      affectedContext: `${p.productId} · ${p.name} · ${p.category} · supplier: ${p.supplier}.`,
      recommendedAction: `Place a replenishment order with ${p.supplier} before the product runs out.`,
      quickActions: ["Order from Supplier", "Notify Inventory Manager"],
    }));
}

/* ------------------------------------------------------------------ */
/* R3 — payments past their due date                                   */
/* ------------------------------------------------------------------ */

export function detectOverduePayments(payments: Payment[]): EngineAlert[] {
  // The rule itself: the payment system marks an invoice "overdue" once its
  // dueDate passes without a payment (paidDate stays null).
  const overdue = payments.filter((p) => p.status === "overdue");
  if (overdue.length === 0) return [];

  const total = overdue.reduce((sum, p) => sum + p.amount, 0);
  const worst = [...overdue].sort(
    (a, b) => daysBetween(b.dueDate, REFERENCE_DATE) - daysBetween(a.dueDate, REFERENCE_DATE),
  )[0];

  return [
    {
      id: "R3-overdue",
      rule: "R3 PAYMENT_OVERDUE",
      type: "payment_overdue",
      severity: "medium",
      title: "Overdue Collections",
      message: `${overdue.length} payments are past due, totalling ${fmtTL(total)}.`,
      date: REFERENCE_DATE,
      detectionNote:
        `Rule R3: ${overdue.length} payments have status "overdue" — their dueDate passed with paidDate still null.`,
      affectedContext:
        `Oldest overdue: ${worst.paymentId} (${fmtTL(worst.amount)}, ` +
        `${daysBetween(worst.dueDate, REFERENCE_DATE)} days late).`,
      recommendedAction: "Send payment reminders, prioritising invoices overdue by 30+ days.",
      quickActions: ["Send Reminder", "Forward to Collections Team"],
    },
  ];
}

/* ------------------------------------------------------------------ */

export function runAlertEngine(
  orders: Order[],
  products: Product[],
  payments: Payment[],
): EngineAlert[] {
  const severityRank = { high: 0, medium: 1, low: 2, info: 3 };
  return [
    ...detectRevenueAnomalies(orders),
    ...detectCriticalStock(products),
    ...detectOverduePayments(payments),
  ].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      b.date.localeCompare(a.date),
  );
}
