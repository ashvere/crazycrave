"use client";

import { useState } from "react";

export type SalesDay = { day: string; label: string; sales: number; revenue: number; orders: number };

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Daily sales, last N days: one series of bars with a hover tooltip and a table fallback. */
export function SalesChart({ days }: { days: SalesDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.sales));
  const height = 160;

  return (
    <figure className="mb-0">
      <div
        className="position-relative d-flex align-items-end gap-2"
        style={{ height: height + 24, borderBottom: "1px solid var(--staff-border)" }}
        onMouseLeave={() => setHover(null)}
      >
        {days.map((d, i) => {
          const h = d.sales > 0 ? Math.max(4, Math.round((d.sales / max) * height)) : 0;
          return (
            <div
              key={d.day}
              className="flex-fill d-flex flex-column justify-content-end align-items-center h-100 position-relative"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${d.label}: ${peso(d.sales)} sales, ${d.orders} orders`}
              style={{ cursor: "default", outline: "none" }}
            >
              <div
                style={{
                  width: "min(100%, 36px)",
                  height: h,
                  background: "var(--staff-accent)",
                  opacity: hover === null || hover === i ? 1 : 0.45,
                  borderRadius: "4px 4px 0 0",
                  transition: "opacity .15s",
                }}
              />
              {hover === i ? (
                <div
                  className="position-absolute bg-white border rounded shadow-sm px-2 py-1 small text-nowrap"
                  style={{ bottom: h + 8, zIndex: 2, pointerEvents: "none" }}
                  role="tooltip"
                >
                  <div className="fw-semibold">{d.label}</div>
                  <div className="tabular-nums">Sales {peso(d.sales)}</div>
                  <div className="tabular-nums text-muted">Revenue {peso(d.revenue)}</div>
                  <div className="tabular-nums text-muted">{d.orders} orders</div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="d-flex gap-2 mt-1">
        {days.map((d) => (
          <span key={d.day} className="flex-fill text-center small text-muted">
            {d.label.split(" ")[0]}
          </span>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>Daily sales</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{d.label}</td>
              <td>{peso(d.sales)}</td>
              <td>{peso(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
