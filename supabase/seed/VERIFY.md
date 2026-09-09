# Menu data — provenance and open questions

`supabase/seed/menu.json` is **generated**, not hand-edited. Its source is
`../restaurant_menu_draft.csv`, which you verified against the menu images.

```bash
npm run menu   # regenerate menu.json from the CSV
npm run seed   # push menu.json into Supabase
```

**167 selectable records across 19 categories.** Every record has a single
numeric `menu_price`.

To change a price, edit the CSV and re-run both commands. `menu.json` is
overwritten each time, so edits made directly to it will be lost.

---

## What the generator does to the CSV

It is deliberately mechanical — it never guesses a price.

### 1. Splits packed variant rows

Rows whose price field held several `/`-separated values became one record per
variant, so each is independently selectable:

| CSV row | Becomes |
| --- | --- |
| `Chicken Wings, 4 pieces / 10 pieces, 395 / 745` | 2 records — ₹395, ₹745 |
| `Spaghetti Aglio Olio…, Veg / Chicken / Prawns, 445 / 495 / 545` | 3 records |
| `Penne Arrabiata, Veg / Chicken / Prawns, 445 / 495 / 545` | 3 records |
| `Penne Creamy Cheese Sauce, Veg / Chicken / Prawns, 445 / 495 / 545` | 3 records |
| `Thai Curry w/ Jasmine Rice, Chicken / Prawns, 495 / 545` | 2 records |
| `Malaysian Laksa, Chicken / Prawn, 445 / 495` | 2 records |
| `Udon Noodle, Finger Tofu, Chicken / Prawns, 495 / 545` | 2 records |
| `Caesar Salad, Veg / Chicken, 425 / 495` | 2 records |

Variant labels that are descriptive rather than priced separately were left
alone as a single record — `Sangria Pitcher / Red / White / 1765`,
`Sangria / White / Red / Rose / 695`, and the `1 pc` staples.

### 2. Drops Favourites rows that repeat their own section

Favourites is a highlights page. These 13 rows duplicate an item listed in its
proper section at the same price, so only the section copy was kept:

Three Bean Spicy Burger · Thai Curry (Veg / Chicken / Prawns) · Lantern Chilli
Chicken · BG Chicken Wings · Chicken Tikka Tandoor · Fried Chicken Sliders ·
Butter Chicken with Coriander Rice · Hazelnut Chocolate Cake · Cassata ·
Grilled Atlantic Salmon · and `Chicken Tikka Bao`, which the CSV listed under
both Non-Veg Starters and Bao at ₹345 (the Bao copy was kept).

The six Favourites-only items were re-homed into a real section:

| Item | Placed in |
| --- | --- |
| Mushroom Galouti Kebab, Onion Rings, BG Signature Nachos (Veg), Loaded Cheese Fries (Veg) | Vegetarian Starters |
| Mutton Pepper Fry, Bacon Wrapped Prawns | Non-Veg Starters |

### 3. Keeps same-named items in different categories apart

The CSV lists **Chicken Tikka** twice at two prices — ₹395 in Non-Veg Starters
and ₹595 in Pizza. These are different dishes, so item identity in the database
is `(category, name, variant)`, and the tally groups on the same key. The
homepage appends the category only when two rows would otherwise read
identically, so the common case stays clean.

Same treatment for `Malaysian Laksa` and `Udon Noodle, Finger Tofu`, which each
appear in both the vegetarian and non-veg main course sections at different
prices.

---

## Open questions for you

Nothing was dropped for being unreadable — every CSV row made it in. But three
things in the CSV are worth a second look:

1. **Grilled Atlantic Salmon is priced twice.** Favourites says **₹795**;
   Non-Veg Main Course says **₹595**. The seed uses **₹595** (its own section).
   If ₹795 is right, fix the CSV row and re-run `npm run menu && npm run seed`.

2. **Two nacho items at different prices.** `BG Signature Nachos (Veg)` ₹395
   (Favourites) and `Nachos` ₹345 (Vegetarian Starters) are both seeded, as
   separate items. If they are the same dish, delete one CSV row.

3. **No beer, wine or spirits anywhere in the CSV.** The drinks it covers are
   pitchers, shooters, classic/signature/tall cocktails and mocktails. For a
   party this is likely the most-ordered category — if beer should be
   trackable, add those rows to the CSV.

Prices are editable on every order in the app, so none of the above blocks the
party: an order can always be recorded at the amount actually charged.
