"use client";

import { useMemo, useState } from "react";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

export function MenuPicker({
  items,
  onSelect,
}: {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
}) {
  // Categories come straight from the data — never a hardcoded UI list.
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      if (!seen.includes(item.category)) seen.push(item.category);
    }
    return seen;
  }, [items]);

  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();

  const visible = useMemo(() => {
    // Searching looks across the whole menu; the category filter only applies
    // when the search box is empty.
    if (trimmed) {
      return items.filter(
        (item) =>
          item.name.toLowerCase().includes(trimmed) ||
          item.variant?.toLowerCase().includes(trimmed) ||
          item.category.toLowerCase().includes(trimmed),
      );
    }
    if (category) return items.filter((item) => item.category === category);
    return items;
  }, [items, trimmed, category]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search menu…"
        aria-label="Search menu"
        className="w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-4 text-base font-medium outline-none placeholder:text-ink-faint focus:border-flame"
      />

      {trimmed ? null : (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2 pb-1">
            <CategoryChip
              label="All"
              active={category === null}
              onClick={() => setCategory(null)}
            />
            {categories.map((name) => (
              <CategoryChip
                key={name}
                label={name}
                active={category === name}
                onClick={() => setCategory(name)}
              />
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-10 text-center text-base font-medium text-ink-faint">
          No items match “{query.trim()}”.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white px-4 py-4 text-left transition active:scale-[0.99] active:border-flame"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold uppercase">
                    {item.name}
                  </span>
                  {item.variant ? (
                    <span className="block truncate text-sm font-medium text-ink-faint">
                      {item.variant}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-lg font-black tabular-nums text-flame">
                  {formatINR(item.menu_price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "border-ink bg-ink text-cream"
          : "border-ink/15 bg-white text-ink-soft"
      }`}
    >
      {label}
    </button>
  );
}
