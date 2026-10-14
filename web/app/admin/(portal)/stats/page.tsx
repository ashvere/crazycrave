import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";
import { manilaDay } from "@/lib/site-visits";

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Row = { shop_id: number; total: number; order_status: string; payment_status: string; created_at: string };

/** Platform statistics (legacy admin/admin_stats.php) plus a per-shop breakdown. */
export default async function AdminStatsPage() {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  const admin = createAdminClient();
  if (!admin) return <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to view stats.</div>;

  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("orders")
      .select("shop_id, total, order_status, payment_status, created_at")
      .range(from, from + 999);
    rows.push(...((data as Row[] | null) ?? []));
    if (!data || data.length < 1000) break;
  }
  const [{ count: customers }, { count: riders }, { data: shops }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "rider").eq("approval_status", "approved"),
    admin.from("restaurants").select("id, name").order("name"),
  ]);

  const today = manilaDay();
  const month = today.slice(0, 7);
  const paidDone = (r: Row) => r.order_status === "completed" && r.payment_status === "paid";
  const sum = (xs: Row[]) => xs.reduce((s, r) => s + Number(r.total), 0);
  const revenue = sum(rows.filter(paidDone));
  const todaySales = sum(rows.filter((r) => paidDone(r) && manilaDay(new Date(r.created_at)) === today));
  const monthSales = sum(rows.filter((r) => paidDone(r) && manilaDay(new Date(r.created_at)).startsWith(month)));
  const count = (s: string) => rows.filter((r) => r.order_status === s).length;

  const metrics = [
    { label: "Total orders", value: rows.length, icon: "bi-bag-check", tone: "" },
    { label: "Pending", value: count("pending"), icon: "bi-hourglass-split", tone: "amber" },
    { label: "Preparing", value: count("preparing"), icon: "bi-fire", tone: "sky" },
    { label: "Out for delivery", value: count("delivering"), icon: "bi-bicycle", tone: "sky" },
    { label: "Delivered", value: count("completed"), icon: "bi-check2-circle", tone: "blue" },
    { label: "Cancelled", value: count("cancelled"), icon: "bi-x-circle", tone: "rose" },
    { label: "Customers", value: customers ?? 0, icon: "bi-people", tone: "" },
    { label: "Active riders", value: riders ?? 0, icon: "bi-person-badge", tone: "" },
  ];

  const byShop = (shops ?? []).map((s) => {
    const mine = rows.filter((r) => Number(r.shop_id) === Number(s.id));
    const done = mine.filter(paidDone);
    return {
      id: Number(s.id),
      name: String(s.name),
      orders: mine.length,
      revenue: sum(done),
      aov: done.length ? sum(done) / done.length : 0,
      cancelled: mine.filter((r) => r.order_status === "cancelled").length,
    };
  });

  return (
    <div className="staff-stats-page">
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">Statistics</h1>
        <p className="staff-page-head__sub">Platform overview at a glance</p>
      </header>

      <section className="staff-stats-hero" aria-label="Key metrics">
        {[
          { label: "Total revenue", value: revenue, hint: "Completed & paid orders", icon: "bi-currency-exchange" },
          { label: "Today’s sales", value: todaySales, hint: new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "short", day: "numeric" }), icon: "bi-calendar-day" },
          { label: "This month", value: monthSales, hint: "Completed & paid orders", icon: "bi-calendar3" },
        ].map((h) => (
          <article key={h.label} className="staff-stats-hero__card">
            <div className="staff-stats-hero__meta">
              <span className="staff-stats-hero__icon" aria-hidden="true">
                <i className={`bi ${h.icon}`} />
              </span>
              <p className="staff-stats-hero__label">{h.label}</p>
            </div>
            <p className="staff-stats-hero__value tabular-nums">{peso(h.value)}</p>
            <p className="staff-stats-hero__hint">{h.hint}</p>
          </article>
        ))}
      </section>

      <section className="staff-stats-section" aria-label="Order and customer metrics">
        <h2 className="staff-stats-section__title">Orders &amp; customers</h2>
        <div className="staff-metrics-grid">
          {metrics.map((m) => (
            <article key={m.label} className={`staff-metric${m.tone ? ` staff-metric--${m.tone}` : ""}`}>
              <span className="staff-metric__icon" aria-hidden="true">
                <i className={`bi ${m.icon}`} />
              </span>
              <p className="staff-metric__label">{m.label}</p>
              <p className="staff-metric__value tabular-nums">{m.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="staff-stats-section">
        <h2 className="staff-stats-section__title">By shop</h2>
        <div className="staff-panel">
          <div className="staff-panel__body staff-table-wrap">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th className="text-end">Orders</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Avg order</th>
                  <th className="text-end">Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {byShop.map((s) => (
                  <tr key={s.id}>
                    <td className="fw-semibold">{s.name}</td>
                    <td className="text-end tabular-nums">{s.orders}</td>
                    <td className="text-end tabular-nums">{peso(s.revenue)}</td>
                    <td className="text-end tabular-nums">{s.aov ? peso(s.aov) : "—"}</td>
                    <td className="text-end tabular-nums">{s.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
