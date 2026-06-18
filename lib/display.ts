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

// Privacy: for the public demo we anonymize individual customer person-names
// at the display layer (the JSON data files are never modified). Corporate
// entities — names carrying a company marker like "A.Ş." or "Ltd." — are
// public-facing and pass through untouched.
const COMPANY_MARKER =
  /(\bA\.?\s?Ş\.?|\bLtd\b|\bŞti\b|\bSan\b|\bTic\b|\bInc\b|\bLLC\b|\bGmbH\b|\bHolding\b|\bCorp\b|\bA\.S\.)/iu;

export const isCompanyName = (name: string): boolean =>
  COMPANY_MARKER.test(name);

/** Initials fallback: "Ayşe Yılmaz" → "A.Y." (uppercased, locale-aware). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "Customer";
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0].toLocaleUpperCase("tr-TR") + ".")
      .join("") || "Customer"
  );
}

/**
 * Privacy-safe label for a customer person-name. Corporate names pass through;
 * person-names become a stable "Customer #0412" derived from the customer id,
 * falling back to initials ("A.Y.") when no id is available. Used everywhere a
 * customer person-name would otherwise be shown.
 */
export function customerLabel(name: string, customerId?: string): string {
  if (!name || isCompanyName(name)) return name;
  const digits = customerId?.replace(/\D/gu, "");
  return digits ? `Customer #${digits}` : initials(name);
}

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
