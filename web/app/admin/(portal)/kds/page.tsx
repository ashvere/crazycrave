import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff-session";
import { resolveStaffShop } from "@/lib/admin-shop-scope";
import { ShopPicker } from "@/components/admin/shop-picker";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { kdsSetStatus } from "./actions";

type Search = Promise<{ shop_id?: string }>;

type Ticket = {
  id: number;
  shop_id: number;
  customer_display_name: string;
  barangay: string;
  delivery_address: string;
  payment_method: string;
  order_status: string;
  total: number;
  created_at: string;
};

const COLUMNS = [
  { key: "pending", title: "New", icon: "bi-bell", next: { to: "preparing", label: "Start cooking" } },
  { key: "preparing", title: "Cooking", icon: "bi-fire", next: { to: "delivering", label: "Mark ready" } },
  { key: "delivering", title: "Ready / out", icon: "bi-bag-check", next: { to: "completed", label: "Done" } },
] as const;

const LATE_MINUTES = 20;

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function ageLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ${min % 60}m` : `${Math.floor(h / 24)}d`;
}

export default async function AdminKdsPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const { shopId, shop, shops } = await resolveStaffShop(staff, sp.shop_id, "/admin/kds");
  // Platform admins without a pick see every shop's tickets on one board.
  const allShops = staff.role === "admin" && !shopId;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, shop_id, customer_display_name, barangay, delivery_address, payment_method, order_status, total, created_at")
    .in("order_status", ["pending", "preparing", "delivering"])
    .order("created_at", { ascending: true })
    .limit(150);
  if (shopId) query = query.eq("shop_id", shopId);
  const { data } = await query;
  const tickets = (data as Ticket[] | null) ?? [];
  const shopName = new Map(shops.map((s) => [s.id, s.name]));

  const ids = tickets.map((t) => t.id);
  const { data: itemRows } = ids.length
    ? await supabase.from("order_items").select("order_id, menu_name, quantity").in("order_id", ids)
    : { data: [] as { order_id: number; menu_name: string; quantity: number }[] };
  const itemsBy = new Map<number, { menu_name: string; quantity: number }[]>();
  for (const it of itemRows ?? []) {
    const list = itemsBy.get(Number(it.order_id)) ?? [];
    list.push({ menu_name: String(it.menu_name), quantity: Number(it.quantity) });
    itemsBy.set(Number(it.order_id), list);
  }

  return (
    <>
      <AutoRefresh seconds={20} />
      <header className="staff-page-head staff-page-head--row">
        <div>
          <h1 className="staff-page-head__title">
            <i className="bi bi-display" aria-hidden="true" /> Kitchen display
          </h1>
          <p className="staff-page-head__sub">
            {shop ? shop.name : "All shops"} · {tickets.length} active {tickets.length === 1 ? "ticket" : "tickets"} ·
            refreshes every 20s
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {shopId ? (
            <Link href={`/admin/pos?shop_id=${shopId}`} className="staff-btn staff-btn--primary">
              <i className="bi bi-calculator" aria-hidden="true" /> POS
            </Link>
          ) : null}
          <Link href={`/admin/kds${shopId ? `?shop_id=${shopId}` : ""}`} className="staff-btn staff-btn--secondary">
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh
          </Link>
        </div>
      </header>

      {staff.role === "admin" ? (
        <ShopPicker basePath="/admin/kds" shops={shops} current={shopId} allLabel="All shops" />
      ) : null}

      <div className="kds-board kds-board--3">
        {COLUMNS.map((col) => {
          const list = tickets.filter((t) => t.order_status === col.key);
          return (
            <section key={col.key} className={`kds-column kds-column--${col.key}`} aria-label={col.title}>
              <header className="kds-column__head">
                <span className="kds-column__title">
                  <i className={`bi ${col.icon}`} aria-hidden="true" /> {col.title}
                </span>
                <span className="kds-column__count">{list.length}</span>
              </header>
              <div className="kds-column__body">
                {list.length === 0 ? (
                  <p className="kds-empty">
                    <i className="bi bi-inbox" aria-hidden="true" />
                    No tickets
                  </p>
                ) : (
                  list.map((t) => {
                    const pickup = /pickup/i.test(`${t.barangay} ${t.delivery_address}`);
                    const pos = /\(POS\)/.test(t.delivery_address);
                    const age = minutesAgo(t.created_at);
                    const late = age >= LATE_MINUTES && col.key !== "delivering";
                    return (
                      <article key={t.id} className={`kds-ticket${late ? " kds-ticket--late" : ""}`}>
                        {allShops ? <p className="kds-ticket__shop">{shopName.get(Number(t.shop_id)) ?? "Shop"}</p> : null}
                        <div className="kds-ticket__top">
                          <strong className="kds-ticket__no tabular-nums">#{t.id}</strong>
                          <span className="kds-ticket__age" title={new Date(t.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}>
                            <i className="bi bi-clock me-1" aria-hidden="true" />
                            {ageLabel(age)}
                          </span>
                        </div>
                        <p className="kds-ticket__customer">{t.customer_display_name}</p>
                        <div className="kds-ticket__tags">
                          <span className={`kds-tag ${pos ? "kds-tag--pos" : pickup ? "kds-tag--pickup" : "kds-tag--delivery"}`}>
                            {pos ? "Counter" : pickup ? "Pickup" : "Delivery"}
                          </span>
                          <span className="kds-tag">{t.payment_method === "gcash" ? "GCash" : "Cash"}</span>
                          <span className="kds-tag tabular-nums">₱{Number(t.total).toFixed(0)}</span>
                        </div>
                        <ul className="kds-ticket__list">
                          {(itemsBy.get(t.id) ?? []).map((it, i) => (
                            <li key={i}>
                              <strong>{it.quantity}×</strong>
                              <span>{it.menu_name}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="kds-ticket__actions">
                          <form action={kdsSetStatus} className="flex-grow-1 d-flex">
                            <input type="hidden" name="order_id" value={t.id} />
                            <input type="hidden" name="to" value={col.next.to} />
                            <button type="submit" className="kds-ticket__next">
                              {col.next.label} <i className="bi bi-arrow-right" aria-hidden="true" />
                            </button>
                          </form>
                          <Link href={`/admin/orders/${t.id}`} className="kds-ticket__icon-btn" aria-label={`Order #${t.id} details`}>
                            <i className="bi bi-three-dots" aria-hidden="true" />
                          </Link>
                          {col.key !== "delivering" ? (
                            <form action={kdsSetStatus} className="d-flex">
                              <input type="hidden" name="order_id" value={t.id} />
                              <input type="hidden" name="to" value="cancelled" />
                              <ConfirmSubmit
                                message={`Cancel order #${t.id}?`}
                                className="kds-ticket__icon-btn kds-ticket__icon-btn--danger"
                              >
                                <i className="bi bi-x-lg" aria-hidden="true" />
                                <span className="visually-hidden">Cancel order #{t.id}</span>
                              </ConfirmSubmit>
                            </form>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
