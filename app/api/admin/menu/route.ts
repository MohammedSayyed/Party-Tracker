import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { denyIfNotAdmin } from "@/lib/adminGuard";
import { parseMenuItemInput } from "@/lib/validation";
import {
  MENU_COLUMNS,
  duplicateMessage,
  findDuplicate,
  toAdminMenuItem,
} from "@/lib/menuItems";
import { compareCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

/**
 * The admin's view of the menu: unlike GET /api/menu this includes inactive
 * items, because the admin needs to see and reactivate them.
 */
export async function GET() {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const { data, error } = await supabaseAdmin()
      .from("menu_items")
      .select(MENU_COLUMNS)
      .order("name", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map(toAdminMenuItem).sort(
      (a, b) =>
        compareCategories(a.category, b.category) ||
        a.name.localeCompare(b.name) ||
        (a.variant ?? "").localeCompare(b.variant ?? ""),
    );

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/admin/menu failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the menu. Please try again." },
      { status: 503 },
    );
  }
}

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

    const clash = await findDuplicate(db, { name, category, variant });
    if (clash) {
      return NextResponse.json(
        { error: duplicateMessage({ name, category, variant }), existing: clash },
        { status: 409 },
      );
    }

    const { data: inserted, error: insertError } = await db
      .from("menu_items")
      .insert({ name, category, variant, menu_price: menuPrice, active })
      .select(MENU_COLUMNS)
      .single();

    if (insertError) {
      // The unique index is the real guard if two admins submit at once.
      if ((insertError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: duplicateMessage({ name, category, variant }) },
          { status: 409 },
        );
      }
      throw insertError;
    }

    return NextResponse.json({ item: toAdminMenuItem(inserted) });
  } catch (err) {
    console.error("POST /api/admin/menu failed:", err);
    return NextResponse.json(
      { error: "Couldn't add the item. Please try again." },
      { status: 503 },
    );
  }
}
