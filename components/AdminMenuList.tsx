"use client";

import { useMemo, useState } from "react";
import { formatINR } from "@/lib/format";
import type { AdminMenuItem } from "@/lib/menuItems";

/**
 * The admin's menu list. Shows inactive items too — they stay in the database
 * and can be reactivated, which is why nothing here deletes.
 */
export function AdminMenuList({
  items,
  loading,
  onEdit,
}: {
  items: AdminMenuItem[];
  loading: boolean;
  onEdit: (item: AdminMenuItem) => void;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!trimmed) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(trimmed) ||
        i.category.toLowerCase().includes(trimmed) ||
        i.variant?.toLowerCase().includes(trimmed),
    );
  }, [items, trimmed]);

  const inactiveCount = items.filter((i) => !i.active).length;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
          Menu
        </h2>
        <p className="text-xs font-medium text-ink-faint">
          {items.length} item{items.length === 1 ? "" : "s"}
          {inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""}
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search menu…"
        aria-label="Search menu items"
        className="mb-3 h-12 w-full rounded-xl border-2 border-ink/15 bg-white px-3 text-base font-medium outline-none placeholder:text-ink-faint focus:border-flame"
      />

      {loading ? (
        <p className="py-6 text-center text-sm font-medium text-ink-faint">Loading menu…</p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-ink-faint">
          {trimmed ? `No items match “${query.trim()}”.` : "No menu items yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className={`truncate text-sm font-bold ${item.active ? "" : "text-ink-faint line-through"}`}>
                  {item.name}
                </p>
                <p className="truncate text-xs font-medium text-ink-faint">
                  {item.category}
                  {item.variant ? ` · ${item.variant}` : ""} · {formatINR(item.menu_price)}
                  {item.active ? "" : " · INACTIVE"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label={`Edit ${item.name}`}
                className="h-11 shrink-0 rounded-xl border-2 border-ink/20 bg-white px-4 text-xs font-black uppercase tracking-wide text-ink-soft transition active:scale-95"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
