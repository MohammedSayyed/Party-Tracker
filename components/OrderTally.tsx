import { formatINR } from "@/lib/format";
import type { TallyRow } from "@/lib/types";

export function OrderTally({ rows }: { rows: TallyRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
        Current tally
      </h2>
      <ul className="overflow-hidden rounded-2xl border-2 border-ink/10 bg-white">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate text-base font-semibold">
              {row.label}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-ink-faint">
              {formatINR(row.total)}
            </span>
            <span className="shrink-0 rounded-full bg-flame/12 px-3 py-1 text-sm font-black tabular-nums text-flame">
              ×{row.quantity}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
