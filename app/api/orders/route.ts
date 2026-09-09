import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTY_ID } from "@/lib/party";
import { parseOrderInput } from "@/lib/validation";
import { createUndoToken, hashUndoToken } from "@/lib/undo";
import type { Order, PartyState, TallyRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 10;

type OrderRow = {
  id: string;
  item_name: string;
  category: string;
  variant: string | null;
  menu_price_at_order: string | number;
  unit_price: string | number;
  quantity: number;
  total_price: string | number;
  created_at: string;
};

const ORDER_COLUMNS =
  "id, item_name, category, variant, menu_price_at_order, unit_price, quantity, total_price, created_at";

/** Never leaks undo_token_hash — it is not selected anywhere in this file. */
function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    item_name: row.item_name,
    category: row.category,
    variant: row.variant,
    menu_price_at_order: Number(row.menu_price_at_order),
    unit_price: Number(row.unit_price),
    quantity: row.quantity,
    total_price: Number(row.total_price),
    created_at: row.created_at,
  };
}

/**
 * The whole homepage in one request: totals, tally and recent orders. At a few
 * hundred orders it is cheaper to aggregate in JS than to add a view or RPC.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("party_id", PARTY_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const orders = ((data ?? []) as OrderRow[]).map(toOrder);
    return NextResponse.json(buildPartyState(orders));
  } catch (err) {
    console.error("GET /api/orders failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the tally. Please try again." },
      { status: 503 },
    );
  }
}

type TallyBucket = {
  name: string;
  variant: string | null;
  category: string;
  quantity: number;
  total: number;
};

function buildPartyState(orders: Order[]): PartyState {
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

function baseLabel(row: { name: string; variant: string | null }): string {
  return row.variant ? `${row.name} · ${row.variant}` : row.name;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseOrderInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { menuItemId, quantity, unitPrice } = parsed.value;

  try {
    const db = supabaseAdmin();

    // Snapshot the menu row so later menu edits can't rewrite history.
    const { data: item, error: itemError } = await db
      .from("menu_items")
      .select("id, name, category, variant, menu_price, active")
      .eq("id", menuItemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item || item.active !== true) {
      return NextResponse.json(
        { error: "That item is no longer on the menu." },
        { status: 400 },
      );
    }

    // The browser's total is ignored entirely; this is the only total stored.
    const totalPrice = Math.round(quantity * unitPrice * 100) / 100;

    const undoToken = createUndoToken();

    const { data: inserted, error: insertError } = await db
      .from("orders")
      .insert({
        menu_item_id: item.id,
        item_name: item.name,
        category: item.category,
        variant: item.variant,
        menu_price_at_order: Number(item.menu_price),
        unit_price: unitPrice,
        quantity,
        total_price: totalPrice,
        party_id: PARTY_ID,
        undo_token_hash: hashUndoToken(undoToken),
      })
      .select(ORDER_COLUMNS)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      order: toOrder(inserted as OrderRow),
      undoToken,
    });
  } catch (err) {
    console.error("POST /api/orders failed:", err);
    return NextResponse.json(
      { error: "Couldn't add the order. Please try again." },
      { status: 503 },
    );
  }
}
