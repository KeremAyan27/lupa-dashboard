"use client";

// Collections — payment status totals and overdue payment cards with
// "Send Reminder" / "Forward to Team" quick actions (report §7.2/07).

import { Send, UserCog } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { formatTL } from "@/lib/format";
import { useToast } from "@/components/AppShell";
import { Card, ErrorState, LoadingState, SectionTitle } from "@/components/ui";
import type { PaymentsResponse } from "@/types/atlas";

export default function PaymentsPage() {
  const { data, loading, error } = useApi<PaymentsResponse>("/api/payments");
  const { toast } = useToast();

  if (loading) return <LoadingState label="Loading collections…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} />;

  const stats = [
    { label: "Collected", value: data.totals.paid, color: "text-mint" },
    { label: "Pending", value: data.totals.pending, color: "text-amber" },
    { label: "Overdue", value: data.totals.overdue, color: "text-red" },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      <Card className="p-4">
        <div className="text-xs text-sub">Overdue collections (total receivable)</div>
        <div className="font-display mt-1 mb-3.5 text-[28px] font-bold">
          {formatTL(data.overdueAmount)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-panel2 px-2 py-2.5 text-center">
              <div className={`font-display text-base font-bold ${s.color}`}>
                {s.value.toLocaleString("tr-TR")}
              </div>
              <div className="mt-0.5 text-[10.5px] text-faint">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Payments past due date</SectionTitle>
      {data.overduePayments.map((p) => (
        <Card key={p.paymentId} className="p-3.5">
          <div className="flex justify-between gap-2">
            <div>
              <div className="text-[13.5px] font-semibold">{p.customerName}</div>
              <div className="mt-0.5 text-[11px] text-faint">
                {p.paymentId} · {p.method}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-sm font-bold">
                {formatTL(p.amount)}
              </div>
              <span className="text-[10.5px] text-red">
                {p.daysOverdue} days overdue
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => toast(`✓ Reminder sent to ${p.customerName}`)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-mint py-2 text-[11.5px] font-semibold text-bg"
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
        </Card>
      ))}
    </div>
  );
}
