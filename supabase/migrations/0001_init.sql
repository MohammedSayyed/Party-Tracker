-- Party Tab - Phase 1 schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------
create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  category    text        not null,
  variant     text,
  menu_price  numeric(10, 2) not null check (menu_price >= 0),
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- Lets the seed script upsert idempotently. Identity is (category, name,
-- variant), not (name, variant): the menu genuinely lists "Chicken Tikka" as
-- both a ₹395 starter and a ₹595 pizza, and those must stay separate rows.
-- NULLS NOT DISTINCT so two rows with the same name and no variant collide
-- (plain unique indexes treat each NULL as distinct). Requires Postgres 15+,
-- which every current Supabase project runs.
create unique index if not exists menu_items_category_name_variant_key
  on public.menu_items (category, name, variant) nulls not distinct;

create index if not exists menu_items_category_idx
  on public.menu_items (category) where active;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  menu_item_id         uuid references public.menu_items (id) on delete set null,
  item_name            text        not null,
  category             text        not null,
  variant              text,
  menu_price_at_order  numeric(10, 2) not null,
  unit_price           numeric(10, 2) not null check (unit_price >= 0),
  quantity             integer     not null check (quantity >= 1 and quantity <= 20),
  total_price          numeric(10, 2) not null,
  party_id             text        not null,
  -- SHA-256 of a random token handed to the submitting browser, so that (and
  -- only that) browser can undo its own order. Only the hash is stored, and
  -- anon has no read access to this table at all.
  undo_token_hash      text,
  created_at           timestamptz not null default now()
);

create index if not exists orders_party_created_idx
  on public.orders (party_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- The browser only ever holds the anon key, and it is granted exactly one
-- thing: reading the active menu. Orders are read and written only through
-- server routes using the service role key, so anon gets no policy on
-- public.orders at all (RLS on + no policy = deny). That keeps undo token
-- hashes unreachable from the browser.
-- ---------------------------------------------------------------------------
alter table public.menu_items enable row level security;
alter table public.orders     enable row level security;

drop policy if exists "menu_items are publicly readable" on public.menu_items;
create policy "menu_items are publicly readable"
  on public.menu_items for select
  to anon, authenticated
  using (active);

-- Deliberately no policies on public.orders: every read and write of orders
-- happens server-side with the service role key, which bypasses RLS.
