// GET /api/payments?from&to&status → collection totals per status within the
// range (matched on dueDate) and the matching payment list, joined to orders
// for the customer name. The list is capped; matchingCount is the full total.

import { NextRequest, NextResponse } from "next/server";
import { daysBetween, getOrders, getPayments, REFERENCE_DATE } from "@/lib/data";
import { normalizeRange } from "@/lib/date-range";
import type {
  ListedPayment,
  PaymentsResponse,
  PaymentStatus,
} from "@/types/atlas";

const LIST_CAP = 30;
const STATUSES: PaymentStatus[] = ["paid", "pending", "overdue"];

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const { from, to } = normalizeRange(params.get("from"), params.get("to"));
    const statusParam = params.get("status");
    const status = STATUSES.find((s) => s === statusParam) ?? null;

    const [payments, orders] = await Promise.all([getPayments(), getOrders()]);
    const customerByOrder = new Map(
      orders.map((o) => [o.orderId, { name: o.customerName, id: o.customerId }]),
    );

    const inRange = payments.filter(
      (p) => p.dueDate.slice(0, 10) >= from && p.dueDate.slice(0, 10) <= to,
    );

    // Per-status totals for the summary strip (range only, status-agnostic)
    const summary = {
      paid: { amount: 0, count: 0 },
      pending: { amount: 0, count: 0 },
      overdue: { amount: 0, count: 0 },
    };
    for (const p of inRange) {
      summary[p.status].amount += p.amount;
      summary[p.status].count += 1;
    }

    const matching = inRange.filter((p) => !status || p.status === status);
    const listed: ListedPayment[] = matching
      .sort((a, b) => b.amount - a.amount)
      .slice(0, LIST_CAP)
      .map((p) => {
        const customer = customerByOrder.get(p.orderId);
        return {
          ...p,
          customerName: customer?.name ?? "Unknown customer",
          customerId: customer?.id ?? "",
          daysOverdue:
            p.status === "overdue"
              ? daysBetween(p.dueDate, REFERENCE_DATE)
              : null,
        };
      });

    const body: PaymentsResponse = {
      summary,
      payments: listed,
      matchingCount: matching.length,
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
