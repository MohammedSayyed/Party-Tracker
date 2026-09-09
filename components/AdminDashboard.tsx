"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { AdminMenuList } from "@/components/AdminMenuList";
import type { AdminMenuItem } from "@/lib/menuItems";
import type { PartyState } from "@/lib/types";

type Stats = PartyState & { partyId: string; activeMenuItems: number };

type Mode =
  | { kind: "none" }
  | { kind: "item" }
  | { kind: "beer" }
  | { kind: "edit"; item: AdminMenuItem };

export function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [notice, setNotice] = useState<string | null>(null);
  const [menu, setMenu] = useState<AdminMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setStats((await res.json()) as Stats);
      setError(null);
    } catch {
      setError("Couldn't load admin stats.");
    }
  }, []);

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/menu", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { items: AdminMenuItem[] };
      setMenu(data.items);
    } catch {
      setError("Couldn't load the menu.");
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadMenu();
  }, [load, loadMenu]);

  return (
    <div className="space-y-6 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Admin</h1>
          <p className="text-xs font-medium text-ink-faint">
            {stats?.partyId ?? "…"}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="h-11 shrink-0 rounded-xl border-2 border-ink/15 bg-white px-4 text-xs font-bold uppercase text-ink-soft"
        >
          Sign out
        </button>
      </header>

      {error ? <Note tone="bad">{error}</Note> : null}
      {notice ? <Note tone="good">{notice}</Note> : null}

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Tracked total" value={stats ? formatINR(stats.trackedTotal) : "…"} wide />
        <Stat label="Orders" value={stats ? String(stats.orderCount) : "…"} />
        <Stat label="Items" value={stats ? String(stats.itemCount) : "…"} />
        <Stat label="Active menu items" value={stats ? String(stats.activeMenuItems) : "…"} wide />
      </section>

      {mode.kind === "none" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { setMode({ kind: "beer" }); setNotice(null); }}
            className="w-full rounded-2xl bg-flame px-6 py-5 text-lg font-black uppercase tracking-wide text-white shadow-lg shadow-flame/30 transition active:scale-[0.98]"
          >
            + Add beer
          </button>
          <button
            type="button"
            onClick={() => { setMode({ kind: "item" }); setNotice(null); }}
            className="w-full rounded-2xl border-2 border-ink bg-white px-6 py-4 text-base font-black uppercase tracking-wide text-ink transition active:scale-[0.99]"
          >
            + Add menu item
          </button>
        </div>
      ) : (
        <ItemForm
          beer={mode.kind === "beer"}
          editing={mode.kind === "edit" ? mode.item : null}
          onCancel={() => setMode({ kind: "none" })}
          onSaved={(msg) => {
            setNotice(msg);
            setMode({ kind: "none" });
            void load();
            void loadMenu();
          }}
        />
      )}

      <AdminMenuList
        items={menu}
        loading={menuLoading}
        onEdit={(item) => { setMode({ kind: "edit", item }); setNotice(null); }}
      />

      <TallyPreview stats={stats} />

      <ClearBill
        disabled={!stats || stats.orderCount === 0}
        orderCount={stats?.orderCount ?? 0}
        onCleared={(n) => { setNotice(`Bill cleared — ${n} order${n === 1 ? "" : "s"} deleted.`); void load(); }}
      />

      <Link href="/" className="flex h-12 items-center justify-center text-sm font-bold uppercase tracking-wide text-ink-faint">
        ← Back to party tab
      </Link>
    </div>
  );
}

function ItemForm({
  beer,
  editing,
  onCancel,
  onSaved,
}: {
  beer: boolean;
  editing: AdminMenuItem | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  // Every field starts from the item's current stored values when editing.
  const [name, setName] = useState(editing?.name ?? "");
  // Beers always land in the Beer category, so that field is fixed, not typed.
  const [category, setCategory] = useState(
    editing?.category ?? (beer ? "Beer" : ""),
  );
  const [variant, setVariant] = useState(editing?.variant ?? "");
  const [price, setPrice] = useState(
    editing ? String(editing.menu_price) : "",
  );
  const [active, setActive] = useState(editing?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = editing !== null;
  // Editing a beer must still let the admin fix a wrong category.
  const lockCategory = beer && !isEdit;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/menu/${editing.id}` : "/api/admin/menu",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: lockCategory ? "Beer" : category,
            variant,
            menuPrice: price,
            active,
          }),
        },
      );
      const data = (await res.json()) as {
        item?: AdminMenuItem;
        error?: string;
      };
      if (!res.ok || !data.item) {
        // Entered values are left in place so the admin can correct them.
        setError(data.error ?? "Couldn't save the item.");
        return;
      }
      const v = data.item.variant ? ` (${data.item.variant})` : "";
      onSaved(
        isEdit
          ? `Menu item updated — ${data.item.name}${v}, ${formatINR(data.item.menu_price)}${data.item.active ? "" : ", inactive"}.`
          : `Added ${data.item.name}${v} — ${formatINR(data.item.menu_price)}.`,
      );
    } catch {
      setError("Couldn't save the item. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-ink/10 bg-white p-4">
      <h2 className="text-base font-black uppercase tracking-wide">
        {isEdit ? "Edit menu item" : beer ? "Add beer" : "Add menu item"}
      </h2>

      <Field label={beer && !isEdit ? "Beer name" : "Item name"}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={beer ? "Kingfisher Ultra" : "Chicken Tandoori"}
          aria-label="Item name"
          className={inputClass}
        />
      </Field>

      {lockCategory ? null : (
        <Field label="Category">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Non-Veg Starters"
            aria-label="Category"
            className={inputClass}
          />
        </Field>
      )}

      <Field label={beer && !isEdit ? "Size (optional)" : "Variant (optional)"}>
        <input
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          placeholder={beer ? "Pint" : "Half"}
          aria-label="Variant"
          className={inputClass}
        />
      </Field>

      <Field label="Menu price">
        <label className="flex items-center gap-2 rounded-xl border-2 border-ink/10 bg-white px-3 focus-within:border-flame">
          <span className="text-xl font-black text-ink-faint">₹</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="350"
            aria-label="Menu price"
            className="h-14 w-full bg-transparent text-xl font-black tabular-nums outline-none"
          />
        </label>
      </Field>

      {isEdit ? (
        <label className="flex h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-ink/10 px-3">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            aria-label="Active"
            className="h-6 w-6 accent-[#e4632a]"
          />
          <span className="text-sm font-bold uppercase tracking-wide">
            Active
            <span className="ml-2 font-medium normal-case text-ink-faint">
              {active ? "orderable by guests" : "hidden from guests"}
            </span>
          </span>
        </label>
      ) : null}

      {error ? <Note tone="bad">{error}</Note> : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 border-ink/15 px-4 py-4 text-sm font-bold uppercase text-ink-soft"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-[2] rounded-xl bg-flame px-4 py-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : beer ? "Add beer" : "Add to menu"}
        </button>
      </div>
    </form>
  );
}

function ClearBill({
  disabled,
  orderCount,
  onCleared,
}: {
  disabled: boolean;
  orderCount: number;
  onCleared: (deleted: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clear", { method: "POST" });
      const data = (await res.json()) as { deleted?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't clear the bill.");
        return;
      }
      setConfirming(false);
      onCleared(data.deleted ?? 0);
    } catch {
      setError("Couldn't clear the bill. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-flame/30 bg-flame/5 p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-flame-dark">
        Danger zone
      </h2>
      {!confirming ? (
        <>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Removes every order for this party so the tally restarts at ₹0. The
            menu is not touched.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming(true)}
            className="mt-3 w-full rounded-xl border-2 border-flame bg-white px-4 py-4 text-sm font-black uppercase tracking-wide text-flame-dark disabled:opacity-40"
          >
            {disabled ? "Nothing to clear" : "Clear entire bill"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-bold text-ink">
            ⚠️ This will permanently delete all {orderCount} order
            {orderCount === 1 ? "" : "s"} for this party and reset the bill to ₹0.
          </p>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Menu items and prices are kept. This cannot be undone.
          </p>
          {error ? <Note tone="bad">{error}</Note> : null}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border-2 border-ink/15 bg-white px-4 py-4 text-sm font-bold uppercase text-ink-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="flex-[2] rounded-xl bg-flame-dark px-4 py-4 text-sm font-black uppercase tracking-wide text-white disabled:opacity-40"
            >
              {busy ? "Clearing…" : "Yes, delete all orders"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function TallyPreview({ stats }: { stats: Stats | null }) {
  if (!stats || stats.tally.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
        Bill summary
      </h2>
      <ul className="overflow-hidden rounded-2xl border-2 border-ink/10 bg-white">
        {stats.tally.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 last:border-b-0">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{row.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-faint">{formatINR(row.total)}</span>
            <span className="shrink-0 rounded-full bg-flame/12 px-2.5 py-1 text-xs font-black tabular-nums text-flame">
              ×{row.quantity}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const inputClass =
  "h-14 w-full rounded-xl border-2 border-ink/10 bg-white px-3 text-base font-semibold outline-none focus:border-flame";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-ink-faint">{label}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-ink px-4 py-4 text-cream ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function Note({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "bad" ? "alert" : undefined}
      className={`mt-2 rounded-xl px-4 py-3 text-center text-sm font-semibold ${
        tone === "bad" ? "bg-flame/10 text-flame-dark" : "bg-ink/8 text-ink"
      }`}
    >
      {children}
    </p>
  );
}
