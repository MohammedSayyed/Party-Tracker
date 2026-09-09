import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTY_ID } from "@/lib/party";
import { parseOrderInput } from "@/lib/validation";
import { createUndoToken, hashUndoToken } from "@/lib/undo";
import { buildPartyState } from "@/lib/tally";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

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
