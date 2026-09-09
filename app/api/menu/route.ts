import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { compareCategories } from "@/lib/categories";
import type { MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("menu_items")
      .select("id, name, category, variant, menu_price")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    const items: MenuItem[] = (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      variant: (row.variant as string | null) ?? null,
      menu_price: Number(row.menu_price),
    }));

    // Group by category in party order; names stay alphabetical within one.
    items.sort(
      (a, b) =>
        compareCategories(a.category, b.category) ||
        a.name.localeCompare(b.name) ||
        (a.variant ?? "").localeCompare(b.variant ?? ""),
    );

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/menu failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the menu. Please try again." },
      { status: 503 },
    );
  }
}
