/**
 * Generates supabase/seed/menu.json from restaurant_menu_draft.csv.
 *
 *   node supabase/seed/build-menu.mjs
 *
 * The CSV is the source of truth for names, categories and prices. This script
 * only does three mechanical things:
 *   1. splits rows whose price holds several "/"-separated values into one
 *      record per variant, so every record has a single numeric price;
 *   2. drops Favourites rows that repeat an item listed in its own section,
 *      and re-homes the Favourites-only items into a real section;
 *   3. reports anything it cannot place, instead of guessing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const csvPath = join(root, "..", "restaurant_menu_draft.csv");

/** Minimal CSV reader: handles the quoted fields this file actually uses. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const rows = parseCSV(readFileSync(csvPath, "utf8"));
const header = rows.shift().map((h) => h.trim());
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

// Favourites is a highlights page: these items are listed again in their own
// section at the same price, so keeping both would double them in the picker.
const FAVOURITE_DUPLICATES = new Set([
  "Three Bean Spicy Burger",
  "Thai Curry (Veg)",
  "Thai Curry (Chicken)",
  "Thai Curry (Prawns)",
  "Lantern Chilli Chicken",
  "BG Chicken Wings",
  "Chicken Tikka Tandoor",
  "Fried Chicken Sliders",
  "Butter Chicken with Coriander Rice",
  "Hazelnut Chocolate Cake",
  "Cassata",
  "Grilled Atlantic Salmon",
]);

// Listed in two sections at the same price - the same dish, not two dishes.
// Keyed by "Category|Name": the copy named here is the one dropped.
const CROSS_SECTION_DUPLICATES = new Set([
  "Non-Veg Starters|Chicken Tikka Bao", // also listed under Bao at the same price
]);

// Favourites-only items, re-homed into the section they belong to.
const FAVOURITE_HOME = {
  "Mushroom Galouti Kebab": "Vegetarian Starters",
  "Onion Rings": "Vegetarian Starters",
  "BG Signature Nachos (Veg)": "Vegetarian Starters",
  "Loaded Cheese Fries (Veg)": "Vegetarian Starters",
  "Mutton Pepper Fry": "Non-Veg Starters",
  "Bacon Wrapped Prawns": "Non-Veg Starters",
};

const items = [];
const dropped = [];
const unplaced = [];

for (const r of rows) {
  const category = r[idx.category].trim();
  const name = r[idx.item_name].trim();
  const variantRaw = (r[idx.variant] ?? "").trim();
  const priceRaw = (r[idx.menu_price] ?? "").trim();

  if (CROSS_SECTION_DUPLICATES.has(`${category}|${name}`)) {
    dropped.push(`${name} (${category})`);
    continue;
  }

  let targetCategory = category;
  if (category === "Favourites") {
    if (FAVOURITE_DUPLICATES.has(name)) {
      dropped.push(name);
      continue;
    }
    const home = FAVOURITE_HOME[name];
    if (!home) { unplaced.push(name); continue; }
    targetCategory = home;
  }

  // A price containing "/" means the row packs several variants into one line.
  const prices = priceRaw.split("/").map((p) => p.trim()).filter(Boolean);
  const variants = variantRaw.split("/").map((v) => v.trim()).filter(Boolean);

  if (prices.length > 1) {
    if (variants.length !== prices.length) {
      unplaced.push(`${name} (${variants.length} variants vs ${prices.length} prices)`);
      continue;
    }
    prices.forEach((p, i) => {
      items.push(makeItem(targetCategory, name, variants[i], p, unplaced));
    });
  } else {
    items.push(makeItem(targetCategory, name, variantRaw || null, prices[0], unplaced));
  }
}

function makeItem(category, name, variant, price, problems) {
  const menu_price = Number(price);
  if (!Number.isFinite(menu_price) || menu_price < 0) {
    problems.push(`${name}: unreadable price "${price}"`);
    return null;
  }
  return { name, category, variant: variant || null, menu_price };
}

const clean = items.filter(Boolean);

// A name can legitimately repeat across categories (Chicken Tikka is both a
// starter and a pizza, at different prices), so identity is category-scoped.
const seen = new Map();
const collisions = [];
for (const it of clean) {
  const key = `${it.category}|${it.name}|${it.variant ?? ""}`;
  if (seen.has(key)) collisions.push(key);
  seen.set(key, it);
}

const out = [...seen.values()];
writeFileSync(join(here, "menu.json"), JSON.stringify(out, null, 2) + "\n");

const byCategory = new Map();
for (const it of out) byCategory.set(it.category, (byCategory.get(it.category) ?? 0) + 1);

console.log(`Wrote ${out.length} items across ${byCategory.size} categories.`);
console.log([...byCategory].map(([c, n]) => `  ${c}: ${n}`).join("\n"));
if (dropped.length) console.log(`\nDropped ${dropped.length} duplicate Favourites rows:\n  ${dropped.join("\n  ")}`);
if (collisions.length) console.log(`\nCollisions: ${collisions.join(", ")}`);
if (unplaced.length) console.log(`\nNOT SEEDED (needs a decision):\n  ${unplaced.join("\n  ")}`);

// Names that appear in more than one category — the tally must not merge them.
const nameCats = new Map();
for (const it of out) {
  if (!nameCats.has(it.name)) nameCats.set(it.name, new Set());
  nameCats.get(it.name).add(it.category);
}
const cross = [...nameCats].filter(([, c]) => c.size > 1);
if (cross.length) {
  console.log(`\nSame name in multiple categories (kept separate):`);
  for (const [n, c] of cross) console.log(`  ${n}: ${[...c].join(" | ")}`);
}
