import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTY_ID } from "@/lib/party";
import { denyIfNotAdmin } from "@/lib/adminGuard";
import { buildPartyState } from "@/lib/tally";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const db = supabaseAdmin();

    const [ordersRes, menuRes] = await Promise.all([
      db
        .from("orders")
        .select(
          "id, item_name, category, variant, menu_price_at_order, unit_price, quantity, total_price, created_at",
        )
        .eq("party_id", PARTY_ID)
        .order("created_at", { ascending: false }),
      db
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (menuRes.error) throw menuRes.error;

    const orders: Order[] = (ordersRes.data ?? []).map((row) => ({
      id: row.id as string,
      item_name: row.item_name as string,
      category: row.category as string,
      variant: (row.variant as string | null) ?? null,
      menu_price_at_order: Number(row.menu_price_at_order),
      unit_price: Number(row.unit_price),
      quantity: row.quantity as number,
      total_price: Number(row.total_price),
      created_at: row.created_at as string,
    }));

    return NextResponse.json({
      ...buildPartyState(orders),
      partyId: PARTY_ID,
      activeMenuItems: menuRes.count ?? 0,
    });
  } catch (err) {
    console.error("GET /api/admin/stats failed:", err);
    return NextResponse.json(
      { error: "Couldn't load admin stats. Please try again." },
      { status: 503 },
    );
  }
}
