"use client";

// Collections — date/status filters, per-status totals for the selected
// range and payment cards with "Send Reminder" / "Forward to Team" quick
// actions (report §7.2/07). Payments are matched to the range by dueDate.

import { useState } from "react";
import { Send, UserCog } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { customerLabel } from "@/lib/display";
import { formatTL, formatTLCompact } from "@/lib/format";
import { useToast } from "@/components/AppShell";
import { DateRangeFilter, FilterSelect, useFilters } from "@/components/filters";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
  SummaryStrip,
} from "@/components/ui";
import type { PaymentsResponse } from "@/types/atlas";

const STATUS_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All Statuses" },
];

const LIST_TITLES: Record<string, string> = {
  overdue: "Payments past due date",
  pending: "Payments awaiting collection",
  paid: "Collected payments",
  all: "Payments in selected range",
};

export default function PaymentsPage() {
  const { from, to } = useFilters();
  const [status, setStatus] = useState("overdue");
  const { toast } = useToast();

  const query = new URLSearchParams({ from, to });
  if (status !== "all") query.set("status", status);
  const { data, loading, error } = useApi<PaymentsResponse>(
    `/api/payments?${query.toString()}`,
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <DateRangeFilter />

      <FilterSelect
        label="Payment status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={setStatus}
      />

      {loading && <LoadingState label="Loading collections…" />}
      {!loading && (error || !data) && <ErrorState message={error ?? "No data"} />}

      {data && (
        <>
          <SummaryStrip
            items={[
              {
                label: "Collected",
                value: formatTLCompact(data.summary.paid.amount),
                note: `${data.summary.paid.count.toLocaleString("tr-TR")} payments in selected range`,
              },
              {
                label: "Pending",
                value: formatTLCompact(data.summary.pending.amount),
                note: `${data.summary.pending.count.toLocaleString("tr-TR")} payments not yet due`,
              },
              {
                label: "Overdue",
                value: formatTLCompact(data.summary.overdue.amount),
                note: `${data.summary.overdue.count.toLocaleString("tr-TR")} payments past due date`,
              },
            ]}
          />

          <SectionTitle>{LIST_TITLES[status]}</SectionTitle>

          {data.payments.length === 0 && <EmptyState />}

          {data.payments.map((p) => {
            const displayName = customerLabel(p.customerName, p.customerId);
            return (
            <Card key={p.paymentId} className="p-3.5">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-semibold">{displayName}</div>
                  <div className="mt-0.5 text-[11px] text-faint">
                    {p.paymentId} · {p.method}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-bold">
                    {formatTL(p.amount)}
                  </div>
                  {p.daysOverdue !== null ? (
                    <span className="text-[10.5px] text-red">
                      {p.daysOverdue} days overdue
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-faint capitalize">
                      {p.status}
                    </span>
                  )}
                </div>
              </div>
              {p.status !== "paid" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => toast(`✓ Reminder sent to ${displayName}`)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-mint py-2 text-[11.5px] font-semibold text-on-accent"
                  >
                    <Send size={13} /> Send Reminder
                  </button>
                  <button
                    onClick={() => toast("✓ Forwarded to collections team")}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line py-2 text-[11.5px] font-semibold"
                  >
                    <UserCog size={13} /> Forward to Team
                  </button>
                </div>
              )}
            </Card>
            );
          })}

          {data.matchingCount > data.payments.length && (
            <div className="text-center text-[10.5px] text-faint">
              Showing the {data.payments.length} largest of{" "}
              {data.matchingCount.toLocaleString("tr-TR")} matching payments
            </div>
          )}
        </>
      )}
    </div>
  );
}
