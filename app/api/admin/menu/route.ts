import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { denyIfNotAdmin } from "@/lib/adminGuard";
import { parseMenuItemInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Adds one item to menu_items. Beers use this same route with category "Beer" —
 * a beer is an ordinary menu item, so it inherits search, ordering, price
 * prefill and the tally for free.
 */
export async function POST(request: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseMenuItemInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, category, variant, menuPrice, active } = parsed.value;

  try {
    const db = supabaseAdmin();

    // Identity is (category, name, variant) — same key as the unique index, so
    // this check and the database agree on what "duplicate" means.
    let existing = db
      .from("menu_items")
      .select("id, name, category, variant, menu_price, active")
      .eq("category", category)
      .eq("name", name);
    existing = variant === null ? existing.is("variant", null) : existing.eq("variant", variant);

    const { data: clash, error: lookupError } = await existing.maybeSingle();
    if (lookupError) throw lookupError;

    if (clash) {
      return NextResponse.json(
        {
          error: `"${name}"${variant ? ` (${variant})` : ""} already exists in ${category}.`,
          existing: { ...clash, menu_price: Number(clash.menu_price) },
        },
        { status: 409 },
      );
    }

    const { data: inserted, error: insertError } = await db
      .from("menu_items")
      .insert({ name, category, variant, menu_price: menuPrice, active })
      .select("id, name, category, variant, menu_price, active")
      .single();

    if (insertError) {
      // The unique index is the real guard if two admins submit at once.
      if ((insertError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: `"${name}" already exists in ${category}.` },
          { status: 409 },
        );
      }
      throw insertError;
    }

    return NextResponse.json({
      item: { ...inserted, menu_price: Number(inserted.menu_price) },
    });
  } catch (err) {
    console.error("POST /api/admin/menu failed:", err);
    return NextResponse.json(
      { error: "Couldn't add the item. Please try again." },
      { status: 503 },
    );
  }
}
