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

export const MAX_NAME_LENGTH = 80;
export const MAX_MENU_PRICE = MAX_UNIT_PRICE;

export type MenuItemInput = {
  name: string;
  category: string;
  variant: string | null;
  menuPrice: number;
  active: boolean;
};

export type MenuItemValidation =
  | { ok: true; value: MenuItemInput }
  | { ok: false; error: string };

/**
 * Validates the body of POST /api/admin/menu. Same posture as orders: the
 * browser is not trusted, everything is trimmed and bounded server-side.
 */
export function parseMenuItemInput(body: unknown): MenuItemValidation {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name === "") return { ok: false, error: "Item name is required." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Item name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  if (category === "") return { ok: false, error: "Category is required." };
  if (category.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Category must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const variantRaw = typeof raw.variant === "string" ? raw.variant.trim() : "";
  if (variantRaw.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Variant must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const priceValue =
    typeof raw.menuPrice === "string" ? Number(raw.menuPrice.trim()) : raw.menuPrice;
  if (typeof priceValue !== "number" || !Number.isFinite(priceValue)) {
    return { ok: false, error: "Enter a valid price." };
  }
  if (priceValue < 0 || priceValue > MAX_MENU_PRICE) {
    return {
      ok: false,
      error: `Price must be between ₹0 and ₹${MAX_MENU_PRICE.toLocaleString("en-IN")}.`,
    };
  }

  return {
    ok: true,
    value: {
      name,
      category,
      variant: variantRaw || null,
      menuPrice: Math.round(priceValue * 100) / 100,
      active: raw.active === undefined ? true : raw.active === true,
    },
  };
}
