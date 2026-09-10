# 🍻 Party Tab

Anonymous restaurant order tracker for a team party. No login, no names, no
accounts — anyone with the URL can record what they just ordered, and everyone
sees a shared running tally to check against the bill.

Next.js (App Router) · TypeScript · Tailwind · Supabase Postgres · Vercel.

---

## 1. Install dependencies

```bash
npm install
```

## 2. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard>.
2. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this secret — server only)

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | server + client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client (menu reads only) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** — API routes and seed |
| `NEXT_PUBLIC_PARTY_ID` | the single party this deployment tracks |
| `ADMIN_PASSWORD` | **server only** — unlocks the hidden admin page |

`.env.local` is gitignored. Never prefix the service role key with
`NEXT_PUBLIC_`.

## 4. Run the migration

Open the Supabase dashboard → **SQL Editor** → paste the contents of
`supabase/migrations/0001_init.sql` → **Run**.

It creates `menu_items` and `orders`, and enables RLS: the browser's anon key
can read the active menu and nothing else. All order reads and writes go
through server routes using the service role key.

## 5. Seed the menu

```bash
npm run seed
```

Reads `supabase/seed/menu.json` and upserts on `(name, variant)`, so you can
edit prices and re-run without creating duplicates.

> ⚠️ `menu.json` currently holds a **placeholder menu**. See
> [`supabase/seed/VERIFY.md`](supabase/seed/VERIFY.md) — replace it with the
> real restaurant menu before the party.

## 6. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>. To try it from your phone on the same Wi-Fi, use
the Network URL that `next dev` prints.

Other scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build       # production build
```

## 7. Deploy to Vercel

```bash
npm i -g vercel
vercel          # link the project
vercel --prod   # deploy
```

Or import the repo at <https://vercel.com/new>.

Then in **Project → Settings → Environment Variables**, add all four variables
from `.env.example` to the **Production** environment (and Preview if you use
it), and redeploy. Vercel auto-detects Next.js — no build config needed.

Share the deployment URL with the table. That's the whole onboarding.

---

## How it works

| Route | Purpose |
| --- | --- |
| `GET /api/menu` | active menu items |
| `GET /api/orders` | tracked total, order/item counts, tally, last 10 orders |
| `POST /api/orders` | validates and inserts one order, returns an undo token |
| `POST /api/orders/undo` | deletes one order, token required |
| `GET/POST/DELETE /api/admin/session` | admin sign-in, sign-out, status |
| `GET /api/admin/stats` | admin totals + bill summary + menu count |
| `GET /api/admin/menu` | lists every menu item, including inactive ones |
| `POST /api/admin/menu` | adds one menu item (or beer) |
| `PATCH /api/admin/menu/[id]` | edits one menu item |
| `POST /api/admin/clear` | deletes every order for the configured party |
| `DELETE /api/admin/orders/[id]` | deletes one order, scoped to that party |

**Totals are never trusted from the browser.** The client sends
`menuItemId`, `quantity` and `unitPrice`; the server re-reads the menu item,
validates (`1 ≤ quantity ≤ 20`, `0 ≤ unitPrice ≤ 100,000`, item still active)
and computes `total_price = quantity × unit_price` itself.

**Orders are snapshots.** `item_name`, `category`, `variant` and
`menu_price_at_order` are copied onto the order at insert time, so editing the
menu later never rewrites history — and comparing `menu_price_at_order` against
`unit_price` shows where someone was charged something different.

**Live-ish updates.** The homepage re-fetches every 5 seconds while visible
(no WebSockets). Backgrounded tabs stop polling and refresh on return.

**Undo.** `POST /api/orders` returns a random token; only its SHA-256 hash is
stored. Undo requires that token and works for 60 seconds server-side (the UI
offers 30). There is no endpoint that deletes an arbitrary order, and the anon
key cannot read or write the `orders` table at all.

---

## Admin

There is a hidden admin page at **`/hot-admin`**. Nothing links to it, and it is
marked `noindex` — but the URL is not the security. Every admin action is
verified server-side.

### Setup

Set `ADMIN_PASSWORD` in `.env.local` (and in Vercel's environment variables for
production). If it is unset, the page loads but every admin action is disabled.

```
ADMIN_PASSWORD=pick-something-long
```

Never prefix it with `NEXT_PUBLIC_`. The password is posted once and exchanged
for an `httpOnly`, `sameSite=strict` cookie holding an HMAC — not the password —
so client JavaScript can neither read the secret nor forge the token. The
session lasts 8 hours.

### Adding beers

Beer prices weren't known when the menu was transcribed, so add them at the
venue:

**`/hot-admin` → `+ ADD BEER`** → name, size (optional), price.

A beer is an ordinary row in `menu_items` with `category = 'Beer'`. There is no
separate beer table, so it immediately inherits search, the order form, price
prefill and the tally. Add `Kingfisher Ultra / Pint / ₹350` and a guest
searching "king" sees it straight away, with ₹350 prefilled and still editable.

`+ ADD MENU ITEM` is the same form with a free-text category, for dishes missing
from the menu.

Duplicates are rejected on `(category, name, variant)` — the same key as the
database's unique index.

### The current bill

The admin page shows a **Current bill** section: every order behind the
subtotal — item, variant, quantity, the price actually charged, the line total
and the time — not just the aggregated tally the homepage shows. Both derive
from the same `orders` rows; the homepage aggregates by item, the admin bill
lists each order.

**GST** sits under the bill as an editable percentage. The amount and grand
total recalculate as you type, with no save button and no reload:

```
Subtotal      ₹4,160.00
GST %  [18]     ₹748.80
Grand total   ₹4,908.80
```

`gstAmount = subtotal × gst% / 100`, and `grandTotal = subtotal + gstAmount` —
GST is never charged on a subtotal that already includes it. The maths runs in
integer paise, so no `₹748.7999999` artifacts. The percentage is UI state only:
it is not stored on orders and not sent to the server, because GST belongs to
the reconciliation, not to any single order. It resets to 18% on reload.

Invalid input (negative, over 100, non-numeric, or a half-typed empty box)
falls back to 0% and shows a note rather than ever rendering `NaN`.

### Deleting one order

Each row in the current bill has a **DELETE** with an inline confirmation, for
fixing a single mis-recorded order without wiping the whole bill. The subtotal,
GST and grand total update immediately; the homepage catches up on its next
5-second poll.

Deletion is server-side and scoped to the configured party — the request
carries only the order id, and the party comes from `NEXT_PUBLIC_PARTY_ID` on
the server, so an id from another party matches nothing and returns 404. Only
that one row is removed: the menu item, its price and every other order are
untouched.

### Resetting the bill

**`/hot-admin` → `CLEAR ENTIRE BILL`** → confirm.

> ⚠️ **This permanently deletes every order for the current party.** There is no
> undo. Use it once, just before the real party starts, to clear test orders.

It deletes only rows in `orders`, in a single server-side statement scoped to
the configured `NEXT_PUBLIC_PARTY_ID`. The party id is never read from the
request, so a client cannot aim it at another party. **Menu items, prices and
categories are untouched** — including beers and dishes added through the admin
page.

Afterwards the homepage shows ₹0 / 0 orders / 0 items on its next 5-second poll.

### Editing the menu

The admin page lists every item — including inactive ones, which guests cannot
see — with a search box and an **EDIT** action on each row.

Editing opens the same form, prefilled from the database. Name, category,
variant, price and active/inactive are all editable.

**Editing a menu item never changes historical orders.** Each order stores its
own snapshot of the item name, category, variant and menu price from the moment
it was placed, so correcting a menu row leaves recorded orders and the tally
exactly as they were — only future orders pick up the new values. Rename
`Test Beer / 650ml / ₹350` to `Kingfisher Ultra / Pint / ₹450` and an order
already placed still reads `Test Beer · 650ml · ₹350`.

Duplicates are rejected on `(category, name, variant)`, excluding the row being
edited — so saving an item unchanged is fine.

**Deactivating** hides an item from search and ordering while keeping the row
and its history; the admin can still see and reactivate it. Nothing in the
admin deletes a menu item, which is why there is no delete button.

Bulk price corrections are still easiest through the CSV:
`npm run menu && npm run seed`.

### Not included

No accounts, no roles, no Supabase Auth — one shared password for one evening.
