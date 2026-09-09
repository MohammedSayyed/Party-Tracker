export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 20;
export const MIN_UNIT_PRICE = 0;
export const MAX_UNIT_PRICE = 100_000;

export type OrderInput = {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
};

export type ValidationResult =
  | { ok: true; value: OrderInput }
  | { ok: false; error: string };

/**
 * Validates the raw JSON body of POST /api/orders. Everything the browser
 * sends is suspect; notably `total_price` is not accepted at all — the server
 * computes it from quantity x unit_price.
 */
export function parseOrderInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const raw = body as Record<string, unknown>;

  const menuItemId = raw.menuItemId;
  if (typeof menuItemId !== "string" || menuItemId.trim() === "") {
    return { ok: false, error: "Please pick an item from the menu." };
  }

  const quantity = toNumber(raw.quantity);
  if (quantity === null || !Number.isInteger(quantity)) {
    return { ok: false, error: "Quantity must be a whole number." };
  }
  if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return {
      ok: false,
      error: `Quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
    };
  }

  const unitPrice = toNumber(raw.unitPrice);
  if (unitPrice === null) {
    return { ok: false, error: "Enter a valid price." };
  }
  if (unitPrice < MIN_UNIT_PRICE || unitPrice > MAX_UNIT_PRICE) {
    return {
      ok: false,
      error: `Price must be between ₹${MIN_UNIT_PRICE} and ₹${MAX_UNIT_PRICE.toLocaleString("en-IN")}.`,
    };
  }

  return {
    ok: true,
    value: {
      menuItemId: menuItemId.trim(),
      quantity,
      // Money is stored to 2dp; round rather than reject odd float input.
      unitPrice: Math.round(unitPrice * 100) / 100,
    },
  };
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}
