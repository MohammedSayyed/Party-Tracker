"use client";

import { useMemo, useState } from "react";
import { formatINRPrecise, formatTime } from "@/lib/format";
import { MAX_GST_PERCENT, computeBill, parseGstPercent } from "@/lib/money";
import type { Order } from "@/lib/types";

const DEFAULT_GST = "18";

/**
 * Reconciliation view: every order behind the subtotal, plus GST derived live
 * from an editable percentage.
 *
 * The subtotal is the server's sum of orders.total_price — this component never
 * invents a total, and nothing here is sent back to the server.
 */
export function CurrentBill({
  orders,
  subtotal,
  onDeleted,
}: {
  orders: Order[];
  subtotal: number;
  onDeleted: (message: string) => void;
}) {
  const [gstInput, setGstInput] = useState(DEFAULT_GST);
  const [confirming, setConfirming] = useState<Order | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gst = useMemo(() => parseGstPercent(gstInput), [gstInput]);
  const bill = useMemo(
    () => computeBill(subtotal, gst.percent),
    [subtotal, gst.percent],
  );

  async function remove(order: Order) {
    setBusyId(order.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete the order.");
        return;
      }
      setConfirming(null);
      onDeleted(
        `Deleted ${order.quantity} × ${order.item_name} — ${formatINRPrecise(order.total_price)}.`,
      );
    } catch {
      setError("Couldn't delete the order. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
          Current bill
        </h2>
        <p className="text-xs font-medium text-ink-faint">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mb-2 rounded-xl bg-flame/10 px-4 py-3 text-center text-sm font-semibold text-flame-dark">
          {error}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink/15 px-4 py-6 text-center text-sm font-medium text-ink-faint">
          Nothing ordered yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border-2 border-ink/10 bg-white px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {order.item_name}
                    {order.variant ? (
                      <span className="font-medium text-ink-faint"> · {order.variant}</span>
                    ) : null}
                  </p>
                  <p className="text-xs font-medium text-ink-faint">
                    {order.quantity} × {formatINRPrecise(order.unit_price)} ·{" "}
                    {formatTime(order.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-black tabular-nums">
                    {formatINRPrecise(order.total_price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setConfirming(order); setError(null); }}
                    aria-label={`Delete order of ${order.quantity} ${order.item_name}`}
                    className="h-11 rounded-xl border-2 border-flame/40 bg-white px-3 text-xs font-black uppercase text-flame-dark transition active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {confirming?.id === order.id ? (
                <div className="mt-3 rounded-xl bg-flame/8 p-3">
                  <p className="text-sm font-bold">Delete this order?</p>
                  <p className="mt-1 text-sm font-medium text-ink-soft">
                    {order.quantity} × {order.item_name} —{" "}
                    {formatINRPrecise(order.total_price)}. This permanently removes
                    it from the party tally.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="h-12 flex-1 rounded-xl border-2 border-ink/15 bg-white text-xs font-bold uppercase text-ink-soft"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(order)}
                      disabled={busyId === order.id}
                      className="h-12 flex-[2] rounded-xl bg-flame-dark text-xs font-black uppercase tracking-wide text-white disabled:opacity-40"
                    >
                      {busyId === order.id ? "Deleting…" : "Delete order"}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2 rounded-2xl bg-ink px-4 py-4 text-cream">
        <Row label="Subtotal" value={formatINRPrecise(bill.subtotal)} />

        <div className="flex items-center justify-between gap-3 border-t border-cream/15 pt-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">
            GST %
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={MAX_GST_PERCENT}
              step="0.5"
              value={gstInput}
              onChange={(e) => setGstInput(e.target.value)}
              aria-label="GST percent"
              className="h-11 w-20 rounded-lg border-2 border-cream/25 bg-cream/10 px-2 text-base font-black tabular-nums text-cream outline-none focus:border-gold"
            />
          </label>
          <span className="text-base font-black tabular-nums">
            {formatINRPrecise(bill.gstAmount)}
          </span>
        </div>

        {gst.error ? (
          <p role="alert" className="text-xs font-bold text-gold">
            {gst.error} Using 0% for now.
          </p>
        ) : null}

        <div className="flex items-baseline justify-between gap-3 border-t border-cream/15 pt-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
            Grand total
          </span>
          <span className="text-2xl font-black tabular-nums">
            {formatINRPrecise(bill.grandTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
        {label}
      </span>
      <span className="text-base font-black tabular-nums">{value}</span>
    </div>
  );
}
