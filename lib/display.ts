// Display-layer translation of Turkish dimension values (categories and
// supplier names). Single source for every screen; the JSON data files and
// API responses stay untouched, and product names remain Turkish by design.

export const CATEGORY_LABELS: Record<string, string> = {
  Elektronik: "Electronics",
  Giyim: "Apparel",
  "Ev & Yaşam": "Home & Living",
  Kozmetik: "Cosmetics",
  Spor: "Sports",
};

export const categoryLabel = (raw: string): string =>
  CATEGORY_LABELS[raw] ?? raw;

/** "Tedarikçi X" → "Supplier X"; anything else passes through. */
export const supplierLabel = (raw: string): string =>
  raw.replace(/^Tedarikçi\s+(\S+)$/u, "Supplier $1");

/**
 * Localize free text from the alert engine. Categories are only replaced
 * when they form a whole " · "-separated segment — never inside product
 * names (e.g. "Spor Çantası" must stay Turkish).
 */
export function localizeText(text: string): string {
  return text
    .split(" · ")
    .map((segment) => CATEGORY_LABELS[segment] ?? segment)
    .join(" · ")
    .replace(/Tedarikçi\s+(\S+)/gu, "Supplier $1");
}
