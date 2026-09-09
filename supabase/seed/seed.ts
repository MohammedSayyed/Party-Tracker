/**
 * Seeds menu_items from supabase/seed/menu.json.
 *
 *   npm run seed
 *
 * Idempotent: upserts on (category, name, variant), so re-running after editing
 * the CSV updates prices instead of creating duplicates.
 *
 * Talks to PostgREST over plain fetch rather than through supabase-js. The
 * client library constructs a realtime socket eagerly and therefore needs a
 * native WebSocket (Node 22+); seeding needs none of that, and this keeps the
 * script working on any Node with fetch (18+).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

type SeedItem = {
  name: string;
  category: string;
  variant?: string | null;
  menu_price: number;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env.local and fill it in.",
  );
  process.exit(1);
}

const file = join(process.cwd(), "supabase/seed/menu.json");
const items = JSON.parse(readFileSync(file, "utf8")) as SeedItem[];

const problems: string[] = [];
const seen = new Set<string>();

for (const [i, item] of items.entries()) {
  const where = `item ${i + 1} (${item.name ?? "unnamed"})`;
  if (!item.name?.trim()) problems.push(`${where}: missing name`);
  if (!item.category?.trim()) problems.push(`${where}: missing category`);
  if (typeof item.menu_price !== "number" || !Number.isFinite(item.menu_price)) {
    problems.push(`${where}: menu_price must be a number`);
  } else if (item.menu_price < 0) {
    problems.push(`${where}: menu_price must be >= 0`);
  }
  const dedupe = `${item.category}|${item.name}|${item.variant ?? ""}`;
  if (seen.has(dedupe)) problems.push(`${where}: duplicate category/name/variant`);
  seen.add(dedupe);
}

if (problems.length > 0) {
  console.error("menu.json has problems:\n  " + problems.join("\n  "));
  process.exit(1);
}

const rows = items.map((item) => ({
  name: item.name.trim(),
  category: item.category.trim(),
  variant: item.variant?.trim() || null,
  menu_price: item.menu_price,
  active: true,
}));

async function main() {
  const res = await fetch(
    `${url}/rest/v1/menu_items?on_conflict=category,name,variant`,
    {
      method: "POST",
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // merge-duplicates turns the insert into an upsert on the named index.
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!res.ok) {
    console.error(`Seed failed (HTTP ${res.status}): ${await res.text()}`);
    process.exit(1);
  }

  const categories = new Set(rows.map((r) => r.category));
  console.log(
    `Seeded ${rows.length} menu items across ${categories.size} categories.`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
