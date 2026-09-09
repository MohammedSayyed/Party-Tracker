import { formatINR } from "@/lib/format";

export function PartySummary({
  trackedTotal,
  orderCount,
  itemCount,
  loading,
}: {
  trackedTotal: number;
  orderCount: number;
  itemCount: number;
  loading: boolean;
}) {
  return (
    <section className="rounded-3xl bg-ink px-5 py-7 text-center text-cream shadow-lg shadow-ink/20">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Tracked total
      </p>
      <p className="mt-2 text-5xl font-black tabular-nums tracking-tight">
        {formatINR(trackedTotal)}
      </p>
      <p className="mt-3 text-sm font-medium text-cream/70">
        {loading ? (
          "Updating tally…"
        ) : (
          <>
            {orderCount} {orderCount === 1 ? "order" : "orders"}
            <span className="mx-2 text-cream/30">•</span>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </>
        )}
      </p>
    </section>
  );
}
