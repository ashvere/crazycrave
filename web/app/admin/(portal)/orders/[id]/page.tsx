import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { AssignRiderForm } from "@/components/admin/assign-rider-form";

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const { id: idRaw } = await params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id < 1) notFound();

  const staff = await requireStaff();
  const shopScope = staffShopId(staff);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, restaurants(name)")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();
  if (shopScope !== null && order.shop_id !== shopScope) notFound();

  const { data: lines } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("id");

  const shopIdForRiders = order.shop_id as number;
  const { data: riderRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "rider")
    .eq("approval_status", "approved")
    .eq("restaurant_id", shopIdForRiders);

  const riders = (riderRows as { id: string; display_name: string | null }[] | null) ?? [];

  const shopName = (order.restaurants as { name: string } | null)?.name ?? "Shop";

  return (
    <>
      <div className="mb-3">
        <Link href="/admin/orders" className="staff-chip staff-chip--menus text-decoration-none">
          ← Orders
        </Link>
      </div>

      <header className="staff-page-head">
        <h1 className="staff-page-head__title">
          Order #{id}
          <span className="text-muted fs-6 fw-normal ms-2">{shopName}</span>
        </h1>
        <p className="staff-page-head__sub">
          {order.customer_display_name} · ₱{Number(order.total).toFixed(2)}
        </p>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <section className="staff-panel">
            <div className="staff-panel__head">
              <span>Status</span>
            </div>
            <div className="staff-panel__body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Order</dt>
                <dd className="col-7">
                  <span className="badge bg-secondary">{order.order_status}</span>
                </dd>
                <dt className="col-5 text-muted">Payment</dt>
                <dd className="col-7">
                  {order.payment_method} / {order.payment_status}
                </dd>
                <dt className="col-5 text-muted">Delivery</dt>
                <dd className="col-7">{order.delivery_status}</dd>
              </dl>
              <OrderStatusForm orderId={id} currentStatus={order.order_status as string} />
            </div>
          </section>
        </div>
        <div className="col-md-6">
          <section className="staff-panel">
            <div className="staff-panel__head">
              <span>Delivery</span>
            </div>
            <div className="staff-panel__body small">
              <p className="mb-1" style={{ whiteSpace: "pre-wrap" }}>{order.delivery_address}</p>
              <p className="text-muted mb-0">{order.barangay}</p>
              {order.customer_phone ? (
                <p className="mb-0 mt-2">
                  <i className="bi bi-telephone me-1" aria-hidden="true" />
                  <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <section className="staff-panel mb-4">
        <div className="staff-panel__head">
          <span>Rider</span>
        </div>
        <div className="staff-panel__body">
          {riders.length === 0 ? (
            <p className="text-muted small mb-0">
              No riders linked to this shop in profiles. Set <code>restaurant_id</code> on rider
              accounts to assign here.
            </p>
          ) : (
            <AssignRiderForm
              orderId={id}
              riders={riders}
              currentRiderId={(order.rider_id as string | null) ?? null}
            />
          )}
        </div>
      </section>

      <section className="staff-panel">
        <div className="staff-panel__head">
          <span>Line items</span>
        </div>
        <div className="staff-panel__body staff-table-wrap">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-end">Price</th>
                <th className="text-end">Qty</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((row) => {
                const item = row as {
                  id: number;
                  menu_name: string;
                  price: number;
                  quantity: number;
                };
                const sub = Number(item.price) * item.quantity;
                return (
                  <tr key={item.id}>
                    <td>{item.menu_name}</td>
                    <td className="text-end">₱{Number(item.price).toFixed(2)}</td>
                    <td className="text-end">{item.quantity}</td>
                    <td className="text-end">₱{sub.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
