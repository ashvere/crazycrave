import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff-session";
import { resolveStaffShop } from "@/lib/admin-shop-scope";
import { ShopPicker } from "@/components/admin/shop-picker";
import { OrderStatusPill } from "@/components/admin/order-badges";
import { manilaDay } from "@/lib/site-visits";

type Search = Promise<{ shop_id?: string }>;

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Shop earnings (legacy admin/earnings.php): revenue totals and recent orders for one shop. */
export default async function AdminEarningsPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const { shopId, shop, shops } = await resolveStaffShop(staff, sp.shop_id, "/admin/earnings");

  const head = (
    <header className="staff-page-head">
      <h1 className="staff-page-head__title">Earnings{shop ? ` — ${shop.name}` : ""}</h1>
      <p className="staff-page-head__sub">Completed &amp; paid orders</p>
    </header>
  );
  if (!shopId) {
    return (
      <>
        {head}
        <ShopPicker basePath="/admin/earnings" shops={shops} current={null} />
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, customer_display_name, total, order_status, payment_status, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = data ?? [];
  const today = manilaDay();
  const month = today.slice(0, 7);
  const paid = rows.filter((r) => r.order_status === "completed" && r.payment_status === "paid");
  const sum = (xs: typeof rows) => xs.reduce((s, r) => s + Number(r.total), 0);
  const dayOf = (r: (typeof rows)[number]) => manilaDay(new Date(String(r.created_at)));

  const cards = [
    { label: "Total revenue", value: peso(sum(paid)), icon: "bi-currency-exchange" },
    { label: "Today", value: peso(sum(paid.filter((r) => dayOf(r) === today))), icon: "bi-calendar-day" },
    { label: "This month", value: peso(sum(paid.filter((r) => dayOf(r).startsWith(month)))), icon: "bi-calendar3" },
    { label: "Total orders", value: String(rows.length), icon: "bi-bag-check" },
  ];

  return (
    <>
      {head}
      {staff.role === "admin" ? <ShopPicker basePath="/admin/earnings" shops={shops} current={shopId} /> : null}
      <div className="staff-metrics-grid mb-3">
        {cards.map((c) => (
          <article key={c.label} className="staff-metric">
            <span className="staff-metric__icon" aria-hidden="true">
              <i className={`bi ${c.icon}`} />
            </span>
            <p className="staff-metric__label">{c.label}</p>
            <p className="staff-metric__value tabular-nums">{c.value}</p>
          </article>
        ))}
      </div>
      <section className="staff-panel">
        <div className="staff-panel__head">
          <i className="bi bi-receipt" aria-hidden="true" />
          <span>Recent orders</span>
        </div>
        <div className="staff-panel__body staff-table-wrap">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="text-end">Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/orders/${r.id}`}>#{r.id}</Link>
                  </td>
                  <td>{r.customer_display_name}</td>
                  <td>
                    <OrderStatusPill status={String(r.order_status)} />
                  </td>
                  <td className="text-end tabular-nums">{peso(Number(r.total))}</td>
                  <td className="small text-muted">
                    {new Date(String(r.created_at)).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
