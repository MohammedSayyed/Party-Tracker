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

export const dynamic = "force-dynamic";

/**
 * Corrects one menu_items row: name, category, variant, price, active.
 *
 * This touches menu_items only. Orders carry their own snapshot of the name,
 * category, variant and menu price taken at the time they were placed, so an
 * edit here never moves historical money or renames a recorded order — only
 * future orders see the new values.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

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

    const { data: existing, error: loadError } = await db
      .from("menu_items")
      .select(MENU_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (loadError) throw loadError;
    if (!existing) {
      return NextResponse.json({ error: "That item no longer exists." }, { status: 404 });
    }

    // Excluding this row means saving an item unchanged is not a duplicate.
    const clash = await findDuplicate(db, { name, category, variant }, id);
    if (clash) {
      return NextResponse.json(
        { error: duplicateMessage({ name, category, variant }), existing: clash },
        { status: 409 },
      );
    }

    const { data: updated, error: updateError } = await db
      .from("menu_items")
      .update({ name, category, variant, menu_price: menuPrice, active })
      .eq("id", id)
      .select(MENU_COLUMNS)
      .single();

    if (updateError) {
      if ((updateError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: duplicateMessage({ name, category, variant }) },
          { status: 409 },
        );
      }
      throw updateError;
    }

    return NextResponse.json({ item: toAdminMenuItem(updated) });
  } catch (err) {
    console.error("PATCH /api/admin/menu/[id] failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the changes. Please try again." },
      { status: 503 },
    );
  }
}
