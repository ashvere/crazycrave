import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shopLogoSrc } from "@/lib/shop-logos";
import { AdminOverview } from "@/components/admin/admin-overview";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { AssignRiderForm } from "@/components/admin/assign-rider-form";
import {
  DeliveryStatusPill,
  OrderStatusPill,
  PaymentMethod,
  PaymentStatusPill,
} from "@/components/admin/order-badges";

type OrderRow = {
  id: number;
  customer_display_name: string;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  delivery_status: string;
  rider_id: string | null;
  created_at: string;
};

export default async function AdminDashboardPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const shopScope = staffShopId(staff);

  if (staff.role === "restaurant" && (staff.restaurantId == null || staff.restaurantId < 1)) {
    return (
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">Kitchen account</h1>
        <p className="staff-page-head__sub text-warning">
          No restaurant is linked to your profile. Ask a platform admin to set{" "}
          <code>restaurant_id</code> on your user in Supabase.
        </p>
      </header>
    );
  }

  const { data: shops } = await supabase
    .from("restaurants")
    .select("id, name, description, logo, is_active")
    .order("id", { ascending: false });

  const shopList = shops ?? [];

  let orders: OrderRow[] = [];
  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, customer_display_name, total, payment_method, payment_status, order_status, delivery_status, rider_id, created_at"
    )
    .order("id", { ascending: false })
    .limit(40);

  if (shopScope !== null) {
    ordersQuery = ordersQuery.eq("shop_id", shopScope);
  }

  const { data: orderRows } = await ordersQuery;
  orders = (orderRows as OrderRow[] | null) ?? [];

  let riders: { id: string; display_name: string | null }[] = [];
  if (shopScope !== null) {
    const { data: r } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "rider")
      .eq("approval_status", "approved")
      .eq("restaurant_id", shopScope);
    riders = (r as { id: string; display_name: string | null }[] | null) ?? [];
  }

  const totalOrders = orders.length;
  const completed = orders.filter((o) => o.order_status === "completed").length;
  const pending = orders.filter((o) => o.order_status === "pending").length;

  if (shopScope !== null) {
    const shop = shopList.find((s) => s.id === shopScope);
    const shopName = shop?.name ?? "Your shop";

    return (
      <>
        <header className="staff-page-head">
          <h1 className="staff-page-head__title">{shopName}</h1>
          <p className="staff-page-head__sub">Kitchen dashboard — orders, menu, and riders</p>
        </header>

        <div className="staff-actions">
          <Link href={`/admin/kds?shop_id=${shopScope}`} className="staff-btn staff-btn--primary">
            <i className="bi bi-display" /> KDS
          </Link>
          <Link href={`/admin/pos?shop_id=${shopScope}`} className="staff-btn staff-btn--primary">
            <i className="bi bi-calculator" /> POS
          </Link>
          <Link href={`/admin/menus?shop_id=${shopScope}`} className="staff-btn staff-btn--success">
            <i className="bi bi-journal-text" /> Menu
          </Link>
          <Link href="/admin/orders" className="staff-btn staff-btn--secondary">
            <i className="bi bi-receipt" /> Orders
          </Link>
        </div>

        <div className="staff-stat-grid">
          <div className="staff-stat">
            <p className="staff-stat__label">Total orders</p>
            <p className="staff-stat__value">{totalOrders}</p>
          </div>
          <div className="staff-stat staff-stat--amber">
            <p className="staff-stat__label">Pending</p>
            <p className="staff-stat__value">{pending}</p>
          </div>
          <div className="staff-stat staff-stat--green">
            <p className="staff-stat__label">Completed</p>
            <p className="staff-stat__value">{completed}</p>
          </div>
        </div>

        <section className="staff-panel">
          <div className="staff-panel__head">
            <i className="bi bi-box-seam" />
            <span>Recent orders</span>
          </div>
          <div className="staff-panel__body staff-table-wrap">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="staff-empty">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>
                      </td>
                      <td>{order.customer_display_name}</td>
                      <td>₱{Number(order.total).toFixed(2)}</td>
                      <td>
                        <div className="staff-stack">
                          <PaymentMethod method={order.payment_method} />
                          <PaymentStatusPill status={order.payment_status} />
                        </div>
                      </td>
                      <td>
                        <OrderStatusPill status={order.order_status} />
                      </td>
                      <td>
                        <DeliveryStatusPill status={order.delivery_status} />
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="staff-view-btn"
                          >
                            View <i className="bi bi-chevron-right" aria-hidden="true" />
                          </Link>
                          <AssignRiderForm
                            orderId={order.id}
                            riders={riders}
                            currentRiderId={order.rider_id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  /* Platform admin */
  return (
    <>
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">Staff dashboard</h1>
        <p className="staff-page-head__sub">Live overview, shops, and platform orders</p>
      </header>

      <AdminOverview />

      <div className="staff-actions">
        <Link href="/admin/orders" className="staff-btn staff-btn--secondary">
          <i className="bi bi-receipt" /> All orders
        </Link>
      </div>

      <section id="shops" className="mb-5">
        <h2 className="h6 text-uppercase text-muted mb-3">Shops</h2>
        <div className="staff-shop-grid">
          {shopList.map((shop) => {
            const logo = shopLogoSrc(shop.logo);
            return (
              <article key={shop.id} className="staff-shop-card">
                <div className="staff-shop-card__img-wrap staff-shop-card__img-wrap--contain">
                  <img
                    src={logo}
                    className="staff-shop-card__img"
                    alt=""
                    loading="lazy"
                  />
                </div>
                <div className="staff-shop-card__body">
                  <h2 className="staff-shop-card__title">{shop.name}</h2>
                  <div className="staff-shop-card__actions">
                    <Link
                      href={`/admin/kds?shop_id=${shop.id}`}
                      className="staff-chip staff-chip--menus"
                    >
                      KDS
                    </Link>
                    <Link
                      href={`/admin/pos?shop_id=${shop.id}`}
                      className="staff-chip staff-chip--edit"
                    >
                      POS
                    </Link>
                    <Link
                      href={`/admin/menus?shop_id=${shop.id}`}
                      className="staff-chip staff-chip--menus"
                    >
                      Menus
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="staff-panel">
        <div className="staff-panel__head">
          <i className="bi bi-receipt" />
          <span>Recent orders (all shops)</span>
        </div>
        <div className="staff-panel__body staff-table-wrap">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="staff-empty">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 20).map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer_display_name}</td>
                    <td>₱{Number(order.total).toFixed(2)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <OrderStatusPill status={order.order_status} />
                        {order.rider_id ? <DeliveryStatusPill status={order.delivery_status} /> : null}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="staff-view-btn"
                      >
                        View <i className="bi bi-chevron-right" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
