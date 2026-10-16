import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { AssignRiderForm } from "@/components/admin/assign-rider-form";
import { fetchAssignableRiders, ridersForShop } from "@/lib/assignable-riders";
import {
  DeliveryStatusPill,
  OrderStatusPill,
  PaymentMethod,
  PaymentStatusPill,
} from "@/components/admin/order-badges";

type OrderRow = {
  id: number;
  customer_display_name: string;
  shop_id: number;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  delivery_status: string;
  rider_id: string | null;
  created_at: string;
  restaurants: { name: string } | null;
};

const placedFmt = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const peso = (n: number) => `₱${Number(n).toFixed(2)}`;

export default async function AdminOrdersPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const shopScope = staffShopId(staff);

  const { data: raw } = await supabase
    .from("orders")
    .select(
      "id, customer_display_name, shop_id, total, payment_method, payment_status, order_status, delivery_status, rider_id, created_at, restaurants(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  let orders = (raw as unknown as OrderRow[] | null) ?? [];
  if (shopScope !== null) {
    orders = orders.filter((o) => o.shop_id === shopScope);
  }

  const allRiders = await fetchAssignableRiders(supabase);

  // Names of the riders who hold these orders (assigned rider may not be linked to the shop).
  const riderIds = [...new Set(orders.map((o) => o.rider_id).filter((v): v is string => !!v))];
  const riderNames = new Map<string, string>();
  if (riderIds.length > 0) {
    const { data: rn } = await supabase.from("profiles").select("id, display_name").in("id", riderIds);
    for (const r of (rn ?? []) as { id: string; display_name: string | null }[]) {
      riderNames.set(r.id, r.display_name?.trim() || "Rider");
    }
  }
  const riderLabel = (o: OrderRow) => (o.rider_id ? riderNames.get(o.rider_id) ?? "Rider" : null);

  const showShop = shopScope === null;

  return (
    <>
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">{showShop ? "All orders" : "Shop orders"}</h1>
        <p className="staff-page-head__sub">
          {orders.length === 0
            ? "Status, riders, and details"
            : `${orders.length} order${orders.length === 1 ? "" : "s"} · newest first`}
        </p>
      </header>

      {orders.length === 0 ? (
        <section className="staff-panel">
          <div className="staff-empty">
            <i className="bi bi-receipt staff-empty__icon" aria-hidden="true" />
            <p className="mb-0">No orders yet</p>
          </div>
        </section>
      ) : (
        <>
          {/* Tablet / desktop: table */}
          <section className="staff-panel d-none d-md-block">
            <div className="staff-panel__body staff-table-wrap">
              <table className="table align-middle staff-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    {showShop ? <th>Shop</th> : null}
                    <th className="text-end">Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Delivery</th>
                    <th className="text-end">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="staff-order-id">#{o.id}</span>
                        <span className="staff-order-time">{placedFmt.format(new Date(o.created_at))}</span>
                      </td>
                      <td className="fw-medium">{o.customer_display_name}</td>
                      {showShop ? <td>{o.restaurants?.name ?? "—"}</td> : null}
                      <td className="text-end fw-semibold tabular-nums">{peso(o.total)}</td>
                      <td>
                        <div className="staff-stack">
                          <PaymentMethod method={o.payment_method} />
                          <PaymentStatusPill status={o.payment_status} />
                        </div>
                      </td>
                      <td>
                        <OrderStatusPill status={o.order_status} />
                      </td>
                      <td>
                        <div className="staff-stack">
                          {o.rider_id ? (
                            <DeliveryStatusPill status={o.delivery_status} />
                          ) : (
                            <span className="staff-pill staff-pill--slate">
                              <i className="bi bi-person-dash" aria-hidden="true" />
                              No rider yet
                            </span>
                          )}
                          {riderLabel(o) ? (
                            <span className="staff-order-time">
                              <i className="bi bi-bicycle me-1" aria-hidden="true" />
                              {riderLabel(o)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap gap-2 align-items-center justify-content-end">
                          <AssignRiderForm orderId={o.id} riders={ridersForShop(allRiders, o.shop_id)} currentRiderId={o.rider_id} currentRiderName={riderLabel(o)} />
                          <Link href={`/admin/orders/${o.id}`} className="staff-view-btn">
                            View <i className="bi bi-chevron-right" aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Phones: one card per order, nothing cut off */}
          <ul className="staff-order-cards d-md-none">
            {orders.map((o) => (
              <li key={o.id} className="staff-order-card">
                <Link href={`/admin/orders/${o.id}`} className="staff-order-card__link">
                  <div className="staff-order-card__top">
                    <span className="staff-order-id">#{o.id}</span>
                    <OrderStatusPill status={o.order_status} />
                  </div>
                  <div className="staff-order-card__main">
                    <div>
                      <div className="fw-semibold">{o.customer_display_name}</div>
                      <div className="staff-order-time">
                        {showShop && o.restaurants?.name ? `${o.restaurants.name} · ` : ""}
                        {riderLabel(o) ? `${riderLabel(o)} · ` : ""}
                        {placedFmt.format(new Date(o.created_at))}
                      </div>
                    </div>
                    <div className="staff-order-card__total tabular-nums">{peso(o.total)}</div>
                  </div>
                  <div className="staff-order-card__meta">
                    <PaymentMethod method={o.payment_method} />
                    <PaymentStatusPill status={o.payment_status} />
                    {o.rider_id ? (
                      <DeliveryStatusPill status={o.delivery_status} />
                    ) : (
                      <span className="staff-pill staff-pill--slate">No rider yet</span>
                    )}
                    <i className="bi bi-chevron-right ms-auto text-muted" aria-hidden="true" />
                  </div>
                </Link>
                <div className="staff-order-card__rider">
                  <AssignRiderForm orderId={o.id} riders={ridersForShop(allRiders, o.shop_id)} currentRiderId={o.rider_id} currentRiderName={riderLabel(o)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
