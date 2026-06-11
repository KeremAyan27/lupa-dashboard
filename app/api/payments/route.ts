// GET /api/payments → collection status totals plus the overdue payment list
// (joined to orders for the customer name, days overdue vs REFERENCE_DATE).

import { NextResponse } from "next/server";
import { daysBetween, getOrders, getPayments, REFERENCE_DATE } from "@/lib/data";
import type { OverduePayment, PaymentsResponse } from "@/types/atlas";

export async function GET() {
  try {
    const [payments, orders] = await Promise.all([getPayments(), getOrders()]);
    const customerByOrder = new Map(
      orders.map((o) => [o.orderId, o.customerName]),
    );

    const totals = { paid: 0, pending: 0, overdue: 0 };
    for (const p of payments) totals[p.status] += 1;

    const overduePayments: OverduePayment[] = payments
      .filter((p) => p.status === "overdue")
      .map((p) => ({
        ...p,
        customerName: customerByOrder.get(p.orderId) ?? "Unknown customer",
        daysOverdue: daysBetween(p.dueDate, REFERENCE_DATE),
      }))
      .sort((a, b) => b.amount - a.amount);

    const body: PaymentsResponse = {
      totals,
      overdueAmount: overduePayments.reduce((s, p) => s + p.amount, 0),
      overduePayments,
      referenceDate: REFERENCE_DATE,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 },
    );
  }
}
