// About & Limitations — static page documenting data provenance, KPI
// assumptions and the scope of this proof of concept.

import { Card } from "@/components/ui";

export const metadata = {
  title: "About & Limitations",
};

const STACK = [
  "Next.js 16",
  "TypeScript (strict)",
  "Tailwind CSS",
  "Recharts",
  "PWA",
  "Vercel",
  "TR ₺ · DD.MM.YYYY",
];

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Card className="p-4">
        <h2 className="mb-1.5 text-[13.5px] font-semibold">Data</h2>
        <p className="text-[12.5px] leading-relaxed text-sub">
          All data is synthetic and reproducible: generated with a Python
          script using a fixed seed (
          <code className="text-mint">random.seed(42)</code>) — 5,189 orders,
          50 products, 200 customers, 4,850 payments and 1,616 stock movements
          covering 01.01.2025 – 31.12.2025. The JSON files in{" "}
          <code className="text-mint">/data</code> are exported from the
          reference workbook and are never edited by hand. Anomalies (March
          −39.5%, April +58.4%, October +23.7%) were intentionally injected to
          demonstrate decision-support scenarios.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-1.5 text-[13.5px] font-semibold">How alerts work</h2>
        <p className="text-[12.5px] leading-relaxed text-sub">
          Every alert comes from one of three transparent threshold rules —
          not machine learning. R1 raises a revenue alert when monthly revenue
          changes by more than ±30% versus the previous month; R2 raises a
          stock alert when a product&apos;s stock falls below its critical
          threshold; R3 raises a collection alert when a payment goes past its
          due date. Each alert shows which rule fired, the affected data and a
          recommended action, so every notification can be traced back to a
          single readable comparison in{" "}
          <code className="text-mint">lib/alert-engine.ts</code>.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-1.5 text-[13.5px] font-semibold">Limitations</h2>
        <ul className="list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed text-sub">
          <li>
            No live ERP/CRM connection; a production deployment would replace
            the JSON files with real system APIs.
          </li>
          <li>
            Conversion Rate and ROI use assumed analytics inputs (sessions and
            marketing cost), as no analytics source exists in the mock set.
          </li>
          <li>
            “Today” is anchored to the dataset end (31.12.2025) so trends and
            overdue ages stay stable and demonstrable.
          </li>
          <li>
            Quick Actions confirm with a toast only; no external systems are
            triggered in this prototype.
          </li>
          <li>
            Alert thresholds were calibrated against the injected anomalies;
            detection performance on unseen anomaly types is not measured.
          </li>
        </ul>
      </Card>

      <div className="flex flex-wrap gap-2">
        {STACK.map((t) => (
          <span
            key={t}
            className="rounded-lg border border-line px-2 py-1 text-[10.5px] text-sub"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
