import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTY_ID } from "@/lib/party";
import { denyIfNotAdmin } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

/**
 * Deletes exactly one order.
 *
 * The party is taken from server configuration, never from the request, so an
 * order id belonging to another party simply does not match and nothing is
 * deleted. Only this row goes: the menu item, its price, and every other order
 * are untouched.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("party_id", PARTY_ID)
      .select("id, item_name, quantity, total_price");

    if (error) throw error;

    // No row matched: either it never existed, was already deleted, or belongs
    // to another party. All three are "not found" from here.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "That order no longer exists." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, deleted: data[0] });
  } catch (err) {
    console.error("DELETE /api/admin/orders/[id] failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete the order. Please try again." },
      { status: 503 },
    );
  }
}
