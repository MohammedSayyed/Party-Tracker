import { formatINR, formatTime } from "@/lib/format";
import type { Order } from "@/lib/types";

export function RecentOrders({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
        Recent orders
      </h2>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li
            key={order.id}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {order.item_name}
                {order.variant ? (
                  <span className="text-ink-faint"> · {order.variant}</span>
                ) : null}
                <span className="text-flame"> × {order.quantity}</span>
              </p>
              <p className="mt-0.5 text-xs font-medium text-ink-faint">
                {formatTime(order.created_at)}
              </p>
            </div>
            <span className="shrink-0 text-base font-bold tabular-nums">
              {formatINR(order.total_price)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
