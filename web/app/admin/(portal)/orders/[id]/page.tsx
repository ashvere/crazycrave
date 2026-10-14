import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { AssignRiderForm } from "@/components/admin/assign-rider-form";
import { proofImageUrl } from "@/lib/delivery-proof";
import { Stars } from "@/components/stars";
import { fetchOrderRatings } from "@/lib/ratings";
import {
  DeliveryStatusPill,
  OrderStatusPill,
  PaymentMethod,
  PaymentStatusPill,
} from "@/components/admin/order-badges";

type Params = Promise<{ id: string }>;

const peso = (n: number) => `₱${Number(n).toFixed(2)}`;

const placedFmt = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Checkout appends "Customer notes: …" (and, before the phone migration, "Contact: …") to the address. */
function splitAddress(raw: string): { address: string; notes: string | null; contact: string | null } {
  let address = raw;
  let notes: string | null = null;
  let contact: string | null = null;
  const c = address.match(/\n\nContact: ([^\n]+)\s*$/);
  if (c) {
    contact = c[1]!.trim();
    address = address.slice(0, c.index);
  }
  const n = address.indexOf("\n\nCustomer notes: ");
  if (n >= 0) {
    notes = address.slice(n + "\n\nCustomer notes: ".length).trim() || null;
    address = address.slice(0, n);
  }
  return { address: address.trim(), notes, contact };
}

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
  const riderId = (order.rider_id as string | null) ?? null;
  const { data: assigned } = riderId
    ? await supabase.from("profiles").select("display_name").eq("id", riderId).maybeSingle()
    : { data: null };
  const riderName = (assigned?.display_name as string | null)?.trim() || (riderId ? "Rider" : null);
  // Let staff reassign to the shop's riders, keeping the current rider selectable.
  const assignable =
    riderId && !riders.some((r) => r.id === riderId)
      ? [{ id: riderId, display_name: riderName }, ...riders]
      : riders;
  const DELIVERY_STEPS = [
    { key: "assigned", label: "Assigned" },
    { key: "picked_up", label: "Picked up" },
    { key: "on_the_way", label: "On the way" },
    { key: "delivered", label: "Delivered" },
  ] as const;
  const { byOrder: ratingByOrder } = await fetchOrderRatings(supabase, [id]);
  const rating = ratingByOrder.get(id) ?? null;
  const proofImg = await proofImageUrl(order.delivery_proof_url as string | null);
  const proofNote = (order.delivery_proof_note as string | null)?.trim() || null;
  const proofAt = order.delivery_proof_at ? placedFmt.format(new Date(order.delivery_proof_at as string)) : null;
  const stepIdx = Math.max(0, DELIVERY_STEPS.findIndex((st) => st.key === order.delivery_status));
  const shopName = (order.restaurants as { name: string } | null)?.name ?? "Shop";

  const items = ((lines ?? []) as { id: number; menu_name: string; price: number; quantity: number }[]).map(
    (it) => ({ ...it, sub: Number(it.price) * it.quantity })
  );
  const itemsTotal = items.reduce((s, it) => s + it.sub, 0);
  const total = Number(order.total);
  const riderFee = Number(order.rider_fee ?? 0) || 0;
  const other = Math.round((total - itemsTotal - riderFee) * 100) / 100;

  const { address, notes, contact } = splitAddress(String(order.delivery_address ?? ""));
  const barangay = String(order.barangay ?? "");
  const pickup = /pickup/i.test(barangay) || /pickup/i.test(address);
  const phone = (order.customer_phone as string | null) || contact;

  return (
    <>
      <Link href="/admin/orders" className="staff-back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" /> All orders
      </Link>

      <header className="staff-page-head staff-order-head">
        <div>
          <h1 className="staff-page-head__title">
            Order #{id}
            <span className="staff-order-head__shop">{shopName}</span>
          </h1>
          <p className="staff-page-head__sub">
            {order.customer_display_name} · {placedFmt.format(new Date(order.created_at as string))}
          </p>
        </div>
        <div className="staff-order-head__right">
          <OrderStatusPill status={order.order_status as string} />
          <span className="staff-order-head__total tabular-nums">{peso(total)}</span>
        </div>
      </header>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <section className="staff-panel h-100">
            <div className="staff-panel__head">
              <i className="bi bi-clipboard-check" aria-hidden="true" />
              <span>Status</span>
            </div>
            <div className="staff-panel__body staff-panel__body--padded">
              <dl className="staff-kv">
                <dt>Order</dt>
                <dd>
                  <OrderStatusPill status={order.order_status as string} />
                </dd>
                <dt>Payment</dt>
                <dd className="staff-stack staff-stack--row">
                  <PaymentMethod method={order.payment_method as string} />
                  <PaymentStatusPill status={order.payment_status as string} />
                </dd>
                <dt>Delivery</dt>
                <dd>
                  <DeliveryStatusPill status={order.delivery_status as string} />
                </dd>
              </dl>
              <OrderStatusForm orderId={id} currentStatus={order.order_status as string} />
            </div>
          </section>
        </div>

        <div className="col-md-6">
          <section className="staff-panel h-100">
            <div className="staff-panel__head">
              <i className={`bi ${pickup ? "bi-shop" : "bi-geo-alt"}`} aria-hidden="true" />
              <span>{pickup ? "Pickup" : "Delivery"}</span>
            </div>
            <div className="staff-panel__body staff-panel__body--padded">
              {pickup ? (
                <p className="mb-2 fw-medium">Customer will pick up at the store.</p>
              ) : (
                <>
                  <p className="mb-1 fw-medium" style={{ whiteSpace: "pre-wrap" }}>
                    {address || "—"}
                  </p>
                  {barangay && barangay.toLowerCase() !== address.toLowerCase() ? (
                    <p className="staff-muted mb-0">{barangay}</p>
                  ) : null}
                </>
              )}

              {notes ? (
                <div className="staff-note">
                  <i className="bi bi-chat-left-text" aria-hidden="true" />
                  <span>{notes}</span>
                </div>
              ) : null}

              {phone ? (
                <div className="staff-contact">
                  <div className="staff-contact__info">
                    <div className="staff-contact__label">Customer number</div>
                    <div className="staff-contact__number tabular-nums">{phone}</div>
                  </div>
                  <a href={`sms:${phone}`} className="staff-contact__btn">
                    <i className="bi bi-chat-dots-fill" aria-hidden="true" />
                    Message
                  </a>
                </div>
              ) : (
                <p className="staff-muted small mt-3 mb-0">No contact number on this order.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="staff-panel mb-3">
        <div className="staff-panel__head">
          <i className="bi bi-bicycle" aria-hidden="true" />
          <span>Rider</span>
        </div>
        <div className="staff-panel__body staff-panel__body--padded">
          {riderId ? (
            <>
              <div className="staff-rider-now">
                <span className="staff-rider-now__avatar" aria-hidden="true">
                  {(riderName ?? "R").charAt(0).toUpperCase()}
                </span>
                <div className="staff-rider-now__main">
                  <p className="staff-rider-now__name">{riderName}</p>
                  <p className="staff-muted small mb-0">Delivering this order</p>
                </div>
                <DeliveryStatusPill status={order.delivery_status as string} />
              </div>
              <ol className="staff-steps" aria-label="Delivery progress">
                {DELIVERY_STEPS.map((st, i) => (
                  <li
                    key={st.key}
                    className={`staff-steps__item${i < stepIdx ? " is-done" : i === stepIdx ? " is-current" : ""}`}
                  >
                    <span className="staff-steps__dot" aria-hidden="true">
                      {i < stepIdx || (i === stepIdx && st.key === "delivered") ? <i className="bi bi-check-lg" /> : null}
                    </span>
                    <span className="staff-steps__label">{st.label}</span>
                  </li>
                ))}
              </ol>
              {proofImg || proofNote ? (
                <div className="staff-proof">
                  <p className="staff-proof__title">
                    <i className="bi bi-camera" aria-hidden="true" /> Proof of delivery
                    {proofAt ? <span className="staff-muted fw-normal"> · {proofAt}</span> : null}
                  </p>
                  {proofImg ? (
                    <a href={proofImg} target="_blank" rel="noopener noreferrer" className="staff-proof__img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proofImg} alt={`Proof of delivery for order #${id}`} loading="lazy" />
                    </a>
                  ) : null}
                  {proofNote ? <p className="staff-proof__note">{proofNote}</p> : null}
                </div>
              ) : null}
              {assignable.length > 1 ? (
                <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                  <span className="staff-muted small">Reassign</span>
                  <AssignRiderForm orderId={id} riders={assignable} currentRiderId={riderId} />
                </div>
              ) : null}
            </>
          ) : riders.length === 0 ? (
            <div className="staff-empty-inline">
              <i className="bi bi-person-x" aria-hidden="true" />
              <div>
                <p className="mb-1 fw-medium">No rider on this order yet.</p>
                <p className="staff-muted small mb-0">
                  Approve a rider and link them to {shopName} on the{" "}
                  <Link href="/admin/riders">Riders</Link> page, then assign them here.
                </p>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="staff-muted small">Assign a rider</span>
              <AssignRiderForm orderId={id} riders={riders} currentRiderId={null} />
            </div>
          )}
        </div>
      </section>

      {rating ? (
        <section className="staff-panel mb-3">
          <div className="staff-panel__head">
            <i className="bi bi-star" aria-hidden="true" />
            <span>Customer rating</span>
          </div>
          <div className="staff-panel__body staff-panel__body--padded">
            <dl className="staff-kv">
              <dt>Food</dt>
              <dd className="d-flex align-items-center gap-2">
                <Stars value={rating.food_rating} /> <span className="fw-semibold">{rating.food_rating}/5</span>
              </dd>
              {rating.rider_rating ? (
                <>
                  <dt>Rider</dt>
                  <dd className="d-flex align-items-center gap-2">
                    <Stars value={rating.rider_rating} /> <span className="fw-semibold">{rating.rider_rating}/5</span>
                  </dd>
                </>
              ) : null}
            </dl>
            {rating.comment ? <p className="staff-review">“{rating.comment}”</p> : null}
          </div>
        </section>
      ) : null}

      <section className="staff-panel">
        <div className="staff-panel__head">
          <i className="bi bi-basket" aria-hidden="true" />
          <span>Items</span>
        </div>
        <div className="staff-panel__body staff-table-wrap">
          <table className="table mb-0 staff-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-end">Price</th>
                <th className="text-end">Qty</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="fw-medium">{it.menu_name}</td>
                  <td className="text-end tabular-nums">{peso(it.price)}</td>
                  <td className="text-end tabular-nums">×{it.quantity}</td>
                  <td className="text-end tabular-nums">{peso(it.sub)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-end staff-muted">Items</td>
                <td className="text-end tabular-nums">{peso(itemsTotal)}</td>
              </tr>
              {riderFee > 0 ? (
                <tr>
                  <td colSpan={3} className="text-end staff-muted">Delivery fee</td>
                  <td className="text-end tabular-nums">{peso(riderFee)}</td>
                </tr>
              ) : null}
              {Math.abs(other) >= 0.01 ? (
                <tr>
                  <td colSpan={3} className="text-end staff-muted">Other charges</td>
                  <td className="text-end tabular-nums">{peso(other)}</td>
                </tr>
              ) : null}
              <tr className="staff-items-table__total">
                <td colSpan={3} className="text-end">Total</td>
                <td className="text-end tabular-nums">{peso(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}
