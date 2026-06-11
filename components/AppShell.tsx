"use client";

// Application shell shared by every page: top bar (logo, page title, info and
// bell buttons), Alert Center drawer, toast notifications and the bottom
// 4-tab navigation. Alert read-state lives here so it survives navigation.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Info,
  LayoutGrid,
  Moon,
  Package,
  Sun,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { FilterProvider } from "@/components/filters";
import { ThemeProvider, useTheme } from "@/components/theme";
import { useApi } from "@/lib/use-api";
import { localizeText } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { Card, SeverityPill, SEVERITY } from "@/components/ui";
import type { AlertsResponse, EngineAlert } from "@/types/atlas";

/* ---------- contexts ---------- */

interface ToastContextValue {
  toast: (message: string) => void;
}
const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

interface AlertsContextValue {
  alerts: EngineAlert[];
  loading: boolean;
  error: string | null;
  readIds: ReadonlySet<string>;
  markRead: (id: string) => void;
}
const AlertsContext = createContext<AlertsContextValue>({
  alerts: [],
  loading: true,
  error: null,
  readIds: new Set(),
  markRead: () => {},
});
export const useAlerts = () => useContext(AlertsContext);

/* ---------- navigation config ---------- */

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/sales", label: "Sales", icon: BarChart3 },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/payments", label: "Payments", icon: Wallet },
] as const;

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/sales": "Sales Analytics",
  "/stock": "Stock Status",
  "/payments": "Collections",
  "/about": "About & Limitations",
};

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/alerts")) return "Alert Center";
  return TITLES[pathname] ?? "Overview";
}

/* ---------- alert icon ---------- */

export function AlertIcon({ alert, size = 15 }: { alert: EngineAlert; size?: number }) {
  if (alert.severity === "high") return <AlertTriangle size={size} />;
  if (alert.type === "revenue_spike") return <TrendingUp size={size} />;
  if (alert.type === "campaign_success") return <CheckCircle2 size={size} />;
  return <Bell size={size} />;
}

/* ---------- shell ---------- */

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FilterProvider>
        <Shell>{children}</Shell>
      </FilterProvider>
    </ThemeProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggle } = useTheme();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());

  const { data, loading, error } = useApi<AlertsResponse>("/api/alerts");
  const alerts = data?.alerts ?? [];
  const unread = alerts.filter((a) => !readIds.has(a.id)).length;

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 1800);
  }, []);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  }, []);

  // Register the service worker for PWA installability.
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <AlertsContext.Provider value={{ alerts, loading, error, readIds, markRead }}>
        <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
          {/* ambient glow, as in the prototype */}
          <div className="app-glow pointer-events-none absolute -top-28 -right-20 size-64" />

          {/* top bar */}
          <header className="relative z-10 flex items-start justify-between px-4 pt-4 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-[22px] items-center justify-center rounded-[7px] bg-mint">
                  <Activity size={14} className="text-on-accent" />
                </span>
                <span className="font-display text-[15px] font-bold">Lupa</span>
                <span className="rounded-md border border-line px-1.5 py-px text-[9.5px] text-faint">
                  DEMO
                </span>
              </div>
              <div className="mt-1 text-[11.5px] text-faint">
                {pageTitle(pathname)}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <Link href="/about" aria-label="About & Limitations" className="text-sub">
                <Info size={19} />
              </Link>
              {/* icon swap is CSS-driven (dark: variant) to stay hydration-safe */}
              <button
                aria-label="Toggle color theme"
                onClick={toggle}
                className="cursor-pointer text-sub"
              >
                <Sun size={19} className="hidden dark:block" />
                <Moon size={19} className="dark:hidden" />
              </button>
              {/* the visible badge count must appear in the accessible name (WCAG 2.5.3) */}
              <button
                aria-label={
                  unread > 0
                    ? `Open Alert Center, ${unread} unread`
                    : "Open Alert Center"
                }
                onClick={() => setDrawerOpen(true)}
                className="relative cursor-pointer text-ink"
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red px-0.5 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
            </div>
          </header>

          <main className="relative z-0 flex-1 pb-24">{children}</main>

          {/* toast */}
          {toastMessage && (
            <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 rounded-[13px] border border-mint-dim bg-panel2 px-4 py-3 text-center text-[12.5px] shadow-2xl">
              {toastMessage}
            </div>
          )}

          {/* alert drawer */}
          {drawerOpen && (
            <AlertDrawer
              alerts={alerts}
              loading={loading}
              readIds={readIds}
              onSelect={(id) => {
                setDrawerOpen(false);
                router.push(`/alerts/${id}`);
              }}
              onClose={() => setDrawerOpen(false)}
            />
          )}

          {/* bottom navigation */}
          <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t border-line bg-bg/90 px-1 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur-md">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <tab.icon
                    size={21}
                    strokeWidth={active ? 2.4 : 2}
                    className={active ? "text-mint" : "text-faint"}
                  />
                  <span
                    className={`text-[10px] ${active ? "font-semibold text-mint" : "font-medium text-faint"}`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </AlertsContext.Provider>
    </ToastContext.Provider>
  );
}

/* ---------- alert center drawer ---------- */

function AlertDrawer({
  alerts,
  loading,
  readIds,
  onSelect,
  onClose,
}: {
  alerts: EngineAlert[];
  loading: boolean;
  readIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[82dvh] w-full max-w-md flex-col rounded-t-[22px] border-t border-line bg-bg"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 pt-4 pb-2.5">
          <span className="font-display flex-1 text-[15px] font-bold">
            Alert Center
          </span>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer text-sub">
            <X size={20} />
          </button>
        </div>
        <div className="scroll-hidden flex flex-col gap-2.5 overflow-y-auto p-3.5">
          {loading && (
            <div className="py-8 text-center text-xs text-sub">
              Running alert engine…
            </div>
          )}
          {!loading && alerts.length === 0 && (
            <div className="py-8 text-center text-xs text-sub">
              No alerts — all rules passed.
            </div>
          )}
          {alerts.map((alert) => {
            const read = readIds.has(alert.id);
            const s = SEVERITY[alert.severity];
            return (
              <Card
                key={alert.id}
                onClick={() => onSelect(alert.id)}
                className={`p-3.5 ${read ? "opacity-60" : s.border}`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`flex size-[30px] shrink-0 items-center justify-center rounded-[9px] ${s.chipBg} ${s.text}`}
                  >
                    <AlertIcon alert={alert} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-[13px] font-semibold">
                        {alert.title}
                      </span>
                      {!read && (
                        <span
                          className={`mt-1.5 size-[7px] shrink-0 rounded-full ${s.dot}`}
                        />
                      )}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-sub">
                      {localizeText(alert.message)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <SeverityPill severity={alert.severity} />
                      <span className="text-[10.5px] text-faint">
                        {formatDate(alert.date)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
