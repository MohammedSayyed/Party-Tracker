/**
 * Bill arithmetic in integer paise.
 *
 * Doing GST in rupees with binary floating point produces artifacts like
 * 748.7999999999999. Every calculation here converts to paise, works in whole
 * numbers, and converts back once at the edge.
 */

export const MIN_GST_PERCENT = 0;
export const MAX_GST_PERCENT = 100;

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function toRupees(paise: number): number {
  return paise / 100;
}

/**
 * Parses the GST field. The input is a free-text box, so it must cope with a
 * half-typed value ("", "12.") without ever yielding NaN downstream.
 */
export function parseGstPercent(raw: string): {
  valid: boolean;
  percent: number;
  error: string | null;
} {
  const text = raw.trim();
  if (text === "") {
    // Mid-edit empty box: treat as 0 so totals stay finite, but flag it so the
    // UI can hold off on showing an error.
    return { valid: false, percent: 0, error: null };
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { valid: false, percent: 0, error: "GST % must be a number." };
  }
  if (value < MIN_GST_PERCENT) {
    return { valid: false, percent: 0, error: "GST % cannot be negative." };
  }
  if (value > MAX_GST_PERCENT) {
    return {
      valid: false,
      percent: 0,
      error: `GST % must be ${MAX_GST_PERCENT} or less.`,
    };
  }
  return { valid: true, percent: value, error: null };
}

export type BillTotals = {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
};

/**
 * subtotal comes from the server's sum of orders.total_price; GST and the
 * grand total are derived. GST is never charged on top of itself.
 */
export function computeBill(subtotal: number, gstPercent: number): BillTotals {
  const subtotalPaise = toPaise(Number.isFinite(subtotal) ? subtotal : 0);
  const percent = Number.isFinite(gstPercent) ? gstPercent : 0;
  const gstPaise = Math.round((subtotalPaise * percent) / 100);
  return {
    subtotal: toRupees(subtotalPaise),
    gstAmount: toRupees(gstPaise),
    grandTotal: toRupees(subtotalPaise + gstPaise),
  };
}
