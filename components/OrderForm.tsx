"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuPicker } from "@/components/MenuPicker";
import { QuantitySelector } from "@/components/QuantitySelector";
import { formatINR } from "@/lib/format";
import { MAX_UNIT_PRICE } from "@/lib/validation";
import type { MenuItem, Order } from "@/lib/types";

const UNDO_SECONDS = 30;

type Confirmed = { order: Order; undoToken: string };

export function OrderForm() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: MenuItem[] };
        if (alive) setItems(data.items);
      } catch {
        if (alive) setLoadError("Couldn't load the menu. Please try again.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function selectItem(item: MenuItem) {
    setSelected(item);
    setQuantity(1);
    // Prefilled from the menu, but the field stays fully editable.
    setPrice(String(item.menu_price));
    setSubmitError(null);
  }

  function reset() {
    setSelected(null);
    setQuantity(1);
    setPrice("");
    setSubmitError(null);
    setConfirmed(null);
  }

  const priceValue = Number(price);
  const priceValid =
    price.trim() !== "" &&
    Number.isFinite(priceValue) &&
    priceValue >= 0 &&
    priceValue <= MAX_UNIT_PRICE;

  // Preview only — the server recomputes and stores its own total.
  const previewTotal = priceValid ? priceValue * quantity : 0;

  async function submit() {
    if (!selected || !priceValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: selected.id,
          quantity,
          unitPrice: priceValue,
        }),
      });
      const data = (await res.json()) as {
        order?: Order;
        undoToken?: string;
        error?: string;
      };
      if (!res.ok || !data.order || !data.undoToken) {
        setSubmitError(data.error ?? "Couldn't add the order. Please try again.");
        return;
      }
      setConfirmed({ order: data.order, undoToken: data.undoToken });
    } catch {
      setSubmitError("Couldn't add the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <SuccessPanel
        confirmed={confirmed}
        onAddAnother={reset}
        onUndone={reset}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton onClick={selected ? () => setSelected(null) : undefined} />
        <h1 className="text-xl font-black uppercase tracking-tight">
          {selected ? "Your order" : "Add my order"}
        </h1>
      </div>

      {loadError ? <ErrorNote>{loadError}</ErrorNote> : null}

      {!selected ? (
        items === null && !loadError ? (
          <p className="py-10 text-center text-base font-medium text-ink-faint">
            Loading menu…
          </p>
        ) : items && items.length === 0 ? (
          <p className="py-10 text-center text-base font-medium text-ink-faint">
            The menu is empty. Run the seed script.
          </p>
        ) : items ? (
          <MenuPicker items={items} onSelect={selectItem} />
        ) : null
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-black uppercase leading-tight">
              {selected.name}
            </h2>
            {selected.variant ? (
              <p className="text-base font-medium text-ink-faint">
                {selected.variant}
              </p>
            ) : null}
          </div>

          <Field label="Price per item">
            {/* A label, so tapping anywhere in the box focuses the field —
                the input itself is only ~32px tall. */}
            <label className="flex items-center gap-2 rounded-2xl border-2 border-ink/10 bg-white px-4 focus-within:border-flame">
              <span className="text-2xl font-black text-ink-faint">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_UNIT_PRICE}
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Price per item"
                className="h-14 w-full bg-transparent text-2xl font-black tabular-nums outline-none"
              />
            </label>
            <p className="mt-1.5 text-xs font-medium text-ink-faint">
              Prefilled from the menu ({formatINR(selected.menu_price)}). Change
              it if you&rsquo;re being charged something different.
            </p>
            {!priceValid && price.trim() !== "" ? (
              <p className="mt-1.5 text-xs font-bold text-flame-dark">
                Enter a price between ₹0 and ₹
                {MAX_UNIT_PRICE.toLocaleString("en-IN")}.
              </p>
            ) : null}
          </Field>

          <Field label="Quantity">
            <QuantitySelector value={quantity} onChange={setQuantity} />
          </Field>

          <div className="flex items-baseline justify-between rounded-2xl bg-ink px-5 py-4 text-cream">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
              Total
            </span>
            <span className="text-3xl font-black tabular-nums">
              {formatINR(previewTotal)}
            </span>
          </div>

          {submitError ? <ErrorNote>{submitError}</ErrorNote> : null}

          <button
            type="button"
            onClick={submit}
            disabled={!priceValid || submitting}
            className="w-full rounded-2xl bg-flame px-6 py-5 text-xl font-black uppercase tracking-wide text-white shadow-lg shadow-flame/30 transition active:scale-[0.98] active:bg-flame-dark disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? "Adding order…" : "Add order"}
          </button>
        </div>
      )}
    </div>
  );
}

function SuccessPanel({
  confirmed,
  onAddAnother,
  onUndone,
}: {
  confirmed: Confirmed;
  onAddAnother: () => void;
  onUndone: () => void;
}) {
  const { order, undoToken } = confirmed;
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS);
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  async function undo() {
    setUndoing(true);
    setUndoError(null);
    try {
      const res = await fetch("/api/orders/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, undoToken }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setUndoError(data.error ?? "Couldn't undo that order.");
        return;
      }
      onUndone();
    } catch {
      setUndoError("Couldn't undo that order.");
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="rounded-3xl bg-ink px-6 py-10 text-center text-cream">
        <p className="text-3xl">✓</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          Order added
        </p>
        <p className="mt-4 text-2xl font-black uppercase">
          {order.quantity} × {order.item_name}
        </p>
        <p className="mt-1 text-4xl font-black tabular-nums">
          {formatINR(order.total_price)}
        </p>
      </div>

      {undoError ? <ErrorNote>{undoError}</ErrorNote> : null}

      {secondsLeft > 0 ? (
        <button
          type="button"
          onClick={undo}
          disabled={undoing}
          className="w-full rounded-2xl border-2 border-ink/20 bg-white px-6 py-4 text-base font-bold uppercase tracking-wide text-ink-soft transition active:scale-[0.99] disabled:opacity-40"
        >
          {undoing ? "Undoing…" : `Undo (${secondsLeft}s)`}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onAddAnother}
        className="w-full rounded-2xl bg-flame px-6 py-5 text-xl font-black uppercase tracking-wide text-white shadow-lg shadow-flame/30 transition active:scale-[0.98] active:bg-flame-dark"
      >
        Add another order
      </button>

      <Link
        href="/"
        className="block w-full rounded-2xl border-2 border-ink/20 px-6 py-4 text-center text-base font-bold uppercase tracking-wide text-ink-soft transition active:scale-[0.99]"
      >
        Back to party tab
      </Link>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-flame/10 px-4 py-3 text-center text-sm font-semibold text-flame-dark"
    >
      {children}
    </p>
  );
}

function BackButton({ onClick }: { onClick?: () => void }) {
  const className =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink/15 bg-white text-xl font-black text-ink-soft";
  return onClick ? (
    <button type="button" aria-label="Back to menu" onClick={onClick} className={className}>
      ←
    </button>
  ) : (
    <Link href="/" aria-label="Back to party tab" className={className}>
      ←
    </Link>
  );
}
