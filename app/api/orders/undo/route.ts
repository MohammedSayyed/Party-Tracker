import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTY_ID } from "@/lib/party";
import { undoTokenMatches } from "@/lib/undo";

export const dynamic = "force-dynamic";

/** Undo stays open for a little longer than the 30s the UI offers. */
const UNDO_WINDOW_MS = 60_000;

/**
 * Deletes exactly one order, and only for the browser that created it: the
 * caller must present the undo token that was returned by POST /api/orders.
 * There is no way to delete an arbitrary order through this endpoint.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const orderId = typeof raw.orderId === "string" ? raw.orderId.trim() : "";
  const undoToken = typeof raw.undoToken === "string" ? raw.undoToken : "";

  if (!orderId || !undoToken) {
    return NextResponse.json({ error: "Couldn't undo that order." }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();

    const { data: order, error } = await db
      .from("orders")
      .select("id, undo_token_hash, created_at")
      .eq("id", orderId)
      .eq("party_id", PARTY_ID)
      .maybeSingle();

    if (error) throw error;

    // Same generic message whether the order is missing, already undone, out
    // of time, or the token is wrong — nothing to probe here.
    const denied = NextResponse.json(
      { error: "Couldn't undo that order." },
      { status: 400 },
    );

    if (!order || typeof order.undo_token_hash !== "string") return denied;
    if (!undoTokenMatches(undoToken, order.undo_token_hash)) return denied;

    const age = Date.now() - new Date(order.created_at as string).getTime();
    if (!Number.isFinite(age) || age > UNDO_WINDOW_MS) return denied;

    const { error: deleteError } = await db
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("party_id", PARTY_ID);

    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/orders/undo failed:", err);
    return NextResponse.json(
      { error: "Couldn't undo that order. Please try again." },
      { status: 503 },
    );
  }
}
