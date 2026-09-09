/**
 * Curated category order for the picker. Alphabetical puts "Bar Bites" first
 * and scatters the drinks, which is the wrong shape for a party — this leads
 * with what gets ordered most. Anything not listed falls to the end in
 * alphabetical order, so a new category from the seed still shows up.
 */
const ORDER = [
  "Beer",
  "Classic Cocktails",
  "Signature Cocktails",
  "Tall Cocktails",
  "Shooters",
  "Pitchers",
  "Mocktails",
  "Bar Bites",
  "Non-Veg Starters",
  "Vegetarian Starters",
  "Pizza",
  "Burgers & Sandwiches",
  "Bao",
  "Dimsums",
  "Pasta & Risotto",
  "Non-Veg Main Course",
  "Vegetarian Main Course",
  "Staples",
  "Salads",
  "Desserts",
];

const RANK = new Map(ORDER.map((name, i) => [name, i]));

export function categoryRank(category: string): number {
  return RANK.get(category) ?? ORDER.length;
}

export function compareCategories(a: string, b: string): number {
  return categoryRank(a) - categoryRank(b) || a.localeCompare(b);
}
