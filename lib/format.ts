const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₹1,050 / ₹18,450 / ₹1,05,000 — Indian digit grouping, no paise. */
export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  return inr.format(Math.round(value));
}

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * ₹748.80 — two decimals, for the admin bill where GST produces paise. The
 * homepage keeps the whole-rupee formatter above.
 */
export function formatINRPrecise(value: number): string {
  if (!Number.isFinite(value)) return "₹0.00";
  return inrPrecise.format(value);
}

/** "8:42 PM" in the viewer's local timezone. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
