import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff-session";
import { resolveStaffShop } from "@/lib/admin-shop-scope";
import { ShopPicker } from "@/components/admin/shop-picker";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { kdsSetStatus } from "./actions";

type Search = Promise<{ shop_id?: string }>;

type Ticket = {
  id: number;
  customer_display_name: string;
  barangay: string;
  delivery_address: string;
  payment_method: string;
  order_status: string;
  created_at: string;
};

const COLUMNS = [
  { key: "pending", title: "New", color: "warning", next: { to: "preparing", label: "Start cooking" } },
  { key: "preparing", title: "Cooking", color: "info", next: { to: "delivering", label: "Ready" } },
  { key: "delivering", title: "Ready / out", color: "success", next: { to: "completed", label: "Done" } },
] as const;

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default async function AdminKdsPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const { shopId, shop, shops } = await resolveStaffShop(staff, sp.shop_id, "/admin/kds");

  const head = (
    <header className="staff-page-head">
      <h1 className="staff-page-head__title">Kitchen display{shop ? ` — ${shop.name}` : ""}</h1>
      <p className="staff-page-head__sub">
        Live tickets. Refreshes every 20 seconds.
      </p>
    </header>
  );

  if (!shopId) {
    return (
      <>
        {head}
        <ShopPicker basePath="/admin/kds" shops={shops} current={null} />
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, customer_display_name, barangay, delivery_address, payment_method, order_status, created_at")
    .eq("shop_id", shopId)
    .in("order_status", ["pending", "preparing", "delivering"])
    .order("created_at", { ascending: true })
    .limit(100);
  const tickets = (data as Ticket[] | null) ?? [];

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
      {head}
      {staff.role === "admin" ? <ShopPicker basePath="/admin/kds" shops={shops} current={shopId} /> : null}

      <div className="row g-3">
        {COLUMNS.map((col) => {
          const list = tickets.filter((t) => t.order_status === col.key);
          return (
            <section key={col.key} className="col-12 col-lg-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h2 className="h6 fw-bold text-uppercase mb-0">{col.title}</h2>
                <span className={`badge rounded-pill text-bg-${col.color}`}>{list.length}</span>
              </div>
              {list.length === 0 ? (
                <div className="staff-panel">
                  <div className="staff-panel__body text-muted small text-center py-4">No tickets</div>
                </div>
              ) : (
                <div className="d-grid gap-2">
                  {list.map((t) => {
                    const pickup = /pickup/i.test(`${t.barangay} ${t.delivery_address}`);
                    const age = minutesAgo(t.created_at);
                    return (
                      <article key={t.id} className={`staff-panel border-start border-4 border-${col.color}`}>
                        <div className="staff-panel__body">
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <strong className="tabular-nums">#{t.id}</strong>
                            <span className={`small ${age >= 20 ? "text-danger fw-semibold" : "text-muted"}`}>
                              {age} min
                            </span>
                          </div>
                          <p className="small mb-2">
                            {t.customer_display_name}{" "}
                            <span className="badge text-bg-light border">{pickup ? "Pickup" : "Delivery"}</span>{" "}
                            <span className="badge text-bg-light border text-uppercase">{t.payment_method}</span>
                          </p>
                          <ul className="list-unstyled small mb-3">
                            {(itemsBy.get(t.id) ?? []).map((it, i) => (
                              <li key={i}>
                                <strong className="tabular-nums">{it.quantity}×</strong> {it.menu_name}
                              </li>
                            ))}
                          </ul>
                          <div className="d-flex gap-2">
                            <form action={kdsSetStatus} className="flex-grow-1">
                              <input type="hidden" name="order_id" value={t.id} />
                              <input type="hidden" name="to" value={col.next.to} />
                              <button type="submit" className="btn btn-sm btn-dark w-100">
                                → {col.next.label}
                              </button>
                            </form>
                            {col.key !== "delivering" ? (
                              <form action={kdsSetStatus}>
                                <input type="hidden" name="order_id" value={t.id} />
                                <input type="hidden" name="to" value="cancelled" />
                                <button type="submit" className="btn btn-sm btn-outline-danger" aria-label={`Cancel order ${t.id}`}>
                                  <i className="bi bi-x-lg" aria-hidden="true" />
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
