export type SalesDay = { day: string; label: string; sales: number; revenue: number; orders: number };

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Daily sales for the last N days as labelled rows: date, a bar scaled to the best
 * day, and the exact amounts. Reads clearly even when most days have no sales.
 */
export function SalesChart({ days, today }: { days: SalesDay[]; today: string }) {
  const max = Math.max(0, ...days.map((d) => d.sales));
  return (
    <table className="sales-days">
      <caption className="visually-hidden">Daily sales and revenue, last {days.length} days</caption>
      <thead className="visually-hidden">
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Share of best day</th>
          <th scope="col">Sales</th>
          <th scope="col">Collected</th>
          <th scope="col">Orders</th>
        </tr>
      </thead>
      <tbody>
        {days.map((d) => {
          const pct = max > 0 ? (d.sales / max) * 100 : 0;
          const isToday = d.day === today;
          return (
            <tr key={d.day} className={`${isToday ? "is-today" : ""}${d.orders === 0 ? " is-empty" : ""}`}>
              <th scope="row" className="sales-days__day">
                {d.label}
                {isToday ? <span className="sales-days__today">Today</span> : null}
              </th>
              <td className="sales-days__bar-cell">
                <span className="sales-days__track">
                  <span className="sales-days__bar" style={{ width: `${d.sales > 0 ? Math.max(pct, 2) : 0}%` }} />
                </span>
              </td>
              <td className="sales-days__num">{d.orders ? peso(d.sales) : "—"}</td>
              <td className="sales-days__num sales-days__muted">{d.orders ? `${peso(d.revenue)} collected` : ""}</td>
              <td className="sales-days__num sales-days__muted">
                {d.orders} {d.orders === 1 ? "order" : "orders"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
