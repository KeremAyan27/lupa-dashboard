// Locale formatting helpers.
// UI copy is English, but values keep Turkish conventions:
// ₺ amounts in tr-TR number format, dates as DD.MM.YYYY.

export const formatTL = (n: number): string =>
  `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)} ₺`;

/** Compact ₺ for chart axes and KPI cards, e.g. "47,7M ₺". */
export const formatTLCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M ₺`;
  if (abs >= 1_000)
    return `${(n / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}K ₺`;
  return formatTL(n);
};

/** ISO date → DD.MM.YYYY */
export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

export const formatPct = (n: number, digits = 1): string =>
  `${n >= 0 ? "+" : "−"}%${Math.abs(n).toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

/* Chart colors (Recharts needs literal values; keep in sync with globals.css) */
export const CHART = {
  bg: "#0A0E14",
  panel2: "#161C28",
  line: "#202838",
  text: "#E6EBF2",
  sub: "#8A95A8",
  faint: "#5B6577",
  mint: "#3DDC97",
  amber: "#F5B544",
  red: "#FF6B6B",
  blue: "#5BA8FF",
  violet: "#B69CFF",
} as const;
