import type { Order, PartyState, TallyRow } from "@/lib/types";

const RECENT_LIMIT = 10;

type TallyBucket = {
  name: string;
  variant: string | null;
  category: string;
  quantity: number;
  total: number;
};

function baseLabel(row: { name: string; variant: string | null }): string {
  return row.variant ? `${row.name} · ${row.variant}` : row.name;
}

/**
 * Aggregates recorded orders into the shape the homepage and the admin page
 * both render. Totals come from what was stored on each order, never from the
 * current menu price — editing the menu later must not move historical money.
 */
export function buildPartyState(orders: Order[]): PartyState {
  // Keyed by category too: the menu lists "Chicken Tikka" as both a ₹395
  // starter and a ₹595 pizza, and the tally must not add those together.
  const buckets = new Map<string, TallyBucket>();
  let trackedTotal = 0;
  let itemCount = 0;

  for (const order of orders) {
    trackedTotal += order.total_price;
    itemCount += order.quantity;

    const key = `${order.category}|${order.item_name}|${order.variant ?? ""}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.quantity += order.quantity;
      existing.total += order.total_price;
    } else {
      buckets.set(key, {
        name: order.item_name,
        variant: order.variant,
        category: order.category,
        quantity: order.quantity,
        total: order.total_price,
      });
    }
  }

  const rows = [...buckets.values()];

  // Two buckets can still read identically (same name and variant in different
  // categories) — only those get the category appended, so the common case
  // stays clean.
  const labelCounts = new Map<string, number>();
  for (const r of rows) {
    const base = baseLabel(r);
    labelCounts.set(base, (labelCounts.get(base) ?? 0) + 1);
  }

  const tally: TallyRow[] = rows
    .map((r) => {
      const base = baseLabel(r);
      return {
        label: (labelCounts.get(base) ?? 0) > 1 ? `${base} (${r.category})` : base,
        quantity: r.quantity,
        total: r.total,
      };
    })
    .sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label));

  return {
    trackedTotal,
    orderCount: orders.length,
    itemCount,
    tally,
    recent: orders.slice(0, RECENT_LIMIT),
  };
}
