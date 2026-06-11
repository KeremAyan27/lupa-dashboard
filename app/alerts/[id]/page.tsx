"use client";

// Alert detail — automatic detection note, affected context, recommended
// action, quick actions and "Mark as Seen" (report §7.2/08-10).

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, Truck, UserCog, Zap } from "lucide-react";
import { localizeText } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { AlertIcon, useAlerts, useToast } from "@/components/AppShell";
import {
  Card,
  ErrorState,
  LoadingState,
  SEVERITY,
  SeverityPill,
} from "@/components/ui";

const ACTION_ICONS: Record<string, typeof Zap> = {
  "Order from Supplier": Truck,
  "Notify Inventory Manager": UserCog,
  "Send Reminder": Send,
  "Forward to Collections Team": UserCog,
  "Share Report": Send,
};

export default function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { alerts, loading, error, markRead } = useAlerts();
  const { toast } = useToast();

  if (loading) return <LoadingState label="Running alert engine…" />;
  if (error) return <ErrorState message={error} />;

  const alert = alerts.find((a) => a.id === id);
  if (!alert) return <ErrorState message={`Alert "${id}" not found.`} />;

  const s = SEVERITY[alert.severity];

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        onClick={() => router.back()}
        className="flex w-fit cursor-pointer items-center gap-1 text-[12.5px] text-sub"
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2">
        <span
          className={`flex size-[30px] items-center justify-center rounded-[9px] ${s.chipBg} ${s.text}`}
        >
          <AlertIcon alert={alert} />
        </span>
        <SeverityPill severity={alert.severity} />
        <span className="text-[11px] text-faint">{formatDate(alert.date)}</span>
        <span className="ml-auto rounded-md border border-line px-1.5 py-px text-[9.5px] text-faint">
          {alert.rule}
        </span>
      </div>

      <h1 className="font-display text-[17px] font-bold">{alert.title}</h1>
      <p className="-mt-1 text-[12.5px] leading-relaxed text-sub">
        {localizeText(alert.message)}
      </p>

      <Card className="p-3.5">
        <div className="mb-1 text-[11px] tracking-wide text-faint">
          AUTOMATIC DETECTION NOTE
        </div>
        <div className="text-[12.5px] leading-relaxed">{localizeText(alert.detectionNote)}</div>
      </Card>

      <Card className="p-3.5">
        <div className="mb-1 text-[11px] tracking-wide text-faint">
          AFFECTED CONTEXT
        </div>
        <div className="text-[12.5px] leading-relaxed">{localizeText(alert.affectedContext)}</div>
      </Card>

      <Card className="border-mint-dim p-3.5">
        <div className="mb-1 text-[11px] tracking-wide text-mint">
          RECOMMENDED ACTION
        </div>
        <div className="text-[12.5px] leading-relaxed">
          {localizeText(alert.recommendedAction)}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {alert.quickActions.map((label, i) => {
          const Icon = ACTION_ICONS[label] ?? Zap;
          return (
            <button
              key={label}
              onClick={() => {
                toast(`✓ ${label}`);
                markRead(alert.id);
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-2 text-[11.5px] font-semibold ${
                i === 0 ? "bg-mint text-on-accent" : "border border-line"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-0.5 flex gap-2">
        <button
          onClick={() => {
            markRead(alert.id);
            toast("✓ Marked as seen");
            router.back();
          }}
          className="flex-1 cursor-pointer rounded-[11px] border border-line bg-panel2 py-2.5 text-xs font-semibold"
        >
          Mark as Seen
        </button>
        <button
          onClick={() => {
            markRead(alert.id);
            toast("✓ Forwarded to marketing team");
          }}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] bg-blue py-2.5 text-xs font-semibold text-on-accent"
        >
          <Send size={13} /> Forward to Marketing
        </button>
      </div>
    </div>
  );
}
