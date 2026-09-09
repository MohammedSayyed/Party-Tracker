"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PartySummary } from "@/components/PartySummary";
import { OrderTally } from "@/components/OrderTally";
import { RecentOrders } from "@/components/RecentOrders";
import type { PartyState } from "@/lib/types";

const POLL_MS = 5000;

const EMPTY: PartyState = {
  trackedTotal: 0,
  orderCount: 0,
  itemCount: 0,
  tally: [],
  recent: [],
};

export function PartyBoard() {
  const [state, setState] = useState<PartyState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as PartyState;
      if (!alive.current) return;
      setState(data);
      setError(null);
    } catch {
      // A failed poll keeps the last good numbers on screen.
      if (alive.current) setError("Couldn't refresh the tally.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();

    const id = setInterval(() => {
      // Don't poll a backgrounded tab; refresh as soon as it comes back.
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const isEmpty = !loading && state.orderCount === 0;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight">🍻 PARTY TAB</h1>
        <p className="mt-1 text-sm font-medium text-ink-soft">
          Track what we order.
        </p>
      </header>

      <PartySummary
        trackedTotal={state.trackedTotal}
        orderCount={state.orderCount}
        itemCount={state.itemCount}
        loading={loading}
      />

      <Link
        href="/order"
        className="block w-full rounded-2xl bg-flame px-6 py-5 text-center text-xl font-black uppercase tracking-wide text-white shadow-lg shadow-flame/30 transition active:scale-[0.98] active:bg-flame-dark"
      >
        + Add my order
      </Link>

      {error ? (
        <p className="rounded-xl bg-flame/10 px-4 py-3 text-center text-sm font-semibold text-flame-dark">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-sm font-medium text-ink-faint">
          Loading tally…
        </p>
      ) : null}

      {isEmpty ? (
        <div className="rounded-2xl border-2 border-dashed border-ink/15 px-6 py-10 text-center">
          <p className="text-lg font-bold">Nothing ordered yet.</p>
          <p className="mt-1 text-base font-medium text-ink-soft">
            Be the first 🍻
          </p>
        </div>
      ) : null}

      <OrderTally rows={state.tally} />
      <RecentOrders orders={state.recent} />
    </div>
  );
}
