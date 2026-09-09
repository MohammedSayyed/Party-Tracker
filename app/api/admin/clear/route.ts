import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTY_ID } from "@/lib/party";
import { denyIfNotAdmin } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

/**
 * Deletes every order for the configured party, in one server-side statement.
 *
 * The party id comes from server configuration and is never read from the
 * request, so a client cannot aim this at another party. Only rows in `orders`
 * are touched — menu_items, prices and categories are left alone.
 */
export async function POST() {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("orders")
      .delete()
      .eq("party_id", PARTY_ID)
      .select("id");

    if (error) throw error;

    return NextResponse.json({ ok: true, deleted: data?.length ?? 0 });
  } catch (err) {
    console.error("POST /api/admin/clear failed:", err);
    return NextResponse.json(
      { error: "Couldn't clear the bill. Please try again." },
      { status: 503 },
    );
  }
}
