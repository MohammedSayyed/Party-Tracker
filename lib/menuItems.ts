import type { SupabaseClient } from "@supabase/supabase-js";

export const MENU_COLUMNS = "id, name, category, variant, menu_price, active";

export type AdminMenuItem = {
  id: string;
  name: string;
  category: string;
  variant: string | null;
  menu_price: number;
  active: boolean;
};

export function toAdminMenuItem(row: Record<string, unknown>): AdminMenuItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    variant: (row.variant as string | null) ?? null,
    menu_price: Number(row.menu_price),
    active: row.active === true,
  };
}

/**
 * Finds an item with the same identity — (category, name, variant), the same
 * key as the unique index. `excludeId` lets an edit skip the row being edited,
 * so saving an item unchanged is not rejected as a duplicate of itself.
 */
export async function findDuplicate(
  db: SupabaseClient,
  identity: { name: string; category: string; variant: string | null },
  excludeId?: string,
): Promise<AdminMenuItem | null> {
  let query = db
    .from("menu_items")
    .select(MENU_COLUMNS)
    .eq("category", identity.category)
    .eq("name", identity.name);

  query = identity.variant === null
    ? query.is("variant", null)
    : query.eq("variant", identity.variant);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? toAdminMenuItem(data) : null;
}

export function duplicateMessage(identity: {
  name: string;
  category: string;
  variant: string | null;
}): string {
  const variant = identity.variant ? ` (${identity.variant})` : "";
  return `"${identity.name}"${variant} already exists in ${identity.category}.`;
}
