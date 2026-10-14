import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CancelOrderModal } from "@/components/store/cancel-order-modal";
import { RateOrderForm } from "@/components/store/rate-order-form";
import { Stars } from "@/components/stars";
import { canRate, fetchOrderRatings } from "@/lib/ratings";
import {
  customerCanCancel,
  customerDeliveryStatusLabel,
  customerTrackingSteps,
  isPickupOrder,
  type CustomerOrderRow,
} from "@/lib/customer-orders";

type Search = Promise<{ cancelled?: string; cancel_error?: string; placed?: string; rated?: string }>;

export default async function OrderTrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const orderId = parseInt((await params).id, 10);
  if (!Number.isFinite(orderId) || orderId < 1) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?login=required&next=/order-track/${orderId}`);

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, customer_id, total, payment_method, order_status, delivery_status, barangay, delivery_address, rider_id, cancel_reason, created_at, restaurants(name)"
    )
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !order) notFound();

  const row = order as unknown as CustomerOrderRow;
  const steps = customerTrackingSteps(row);
  const canCancel = customerCanCancel(row);
  const pickup = isPickupOrder(row);
  const shopName = row.restaurants?.name ?? "Shop";

  let riderName: string | null = null;
  if (row.rider_id) {
    const { data: rp } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", row.rider_id)
      .maybeSingle();
    riderName = (rp?.display_name as string | null) ?? null;
  }

  const showRating = canRate(row);
  const { available: ratingsOn, byOrder } = showRating
    ? await fetchOrderRatings(supabase, [orderId])
    : { available: false, byOrder: new Map() };
  const myRating = byOrder.get(orderId) ?? null;

  const sp = await searchParams;
  let alert: { kind: "success" | "warning"; message: string } | null = null;
  if (sp.placed === "1") {
    alert = {
      kind: "success",
      message: "Order placed! The shop has received it — you can follow its progress here.",
    };
  } else if (sp.cancelled === "1") {
    alert = { kind: "success", message: "Your order has been cancelled." };
  } else if (sp.cancel_error === "not_allowed") {
    alert = { kind: "warning", message: "This order can no longer be cancelled." };
  } else if (sp.cancel_error) {
    alert = { kind: "warning", message: "Could not cancel. Please try again." };
  }

  return (
    <>
      <main className="order-track-page">
        <div className="order-track-page__inner">
          <header className="order-track-page__intro">
            <Link href="/my-orders" className="order-track-page__back">
              <i className="bi bi-arrow-left" aria-hidden="true" />
              <span>Back to my orders</span>
            </Link>
            <p className="order-track-page__kicker">Order tracking</p>
            <h1 className="order-track-page__title">Order #{orderId}</h1>
            <p className="order-track-page__shop">{shopName}</p>
            <Link href={`/order-track/${orderId}/receipt`} className="btn btn-sm btn-outline-dark mt-2">
              <i className="bi bi-receipt me-1" aria-hidden="true" />
              View receipt
            </Link>
          </header>

          {alert ? (
            <div className={`alert alert-${alert.kind === "success" ? "success" : "warning"}`}>
              {alert.message}
            </div>
          ) : null}

          <div className="order-track-page__grid">
            <section className="order-track-status-card" aria-live="polite">
              <p className="order-track-status-card__label">Current status</p>
              <p className="order-track-status-card__headline">{customerDeliveryStatusLabel(row)}</p>
              <p className="order-track-status-card__meta text-muted small mb-0">
                Placed{" "}
                {new Date(row.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}₱{Number(row.total).toFixed(2)}
              </p>
            </section>

            <section className="order-track-timeline" aria-label="Order progress">
              <ol className="order-track-timeline__list">
                {steps.map((step) => (
                  <li
                    key={step.key}
                    className={`order-track-timeline__item order-track-timeline__item--${step.state}`}
                  >
                    <span className="order-track-timeline__dot" aria-hidden="true" />
                    <div className="order-track-timeline__content">
                      <p className="order-track-timeline__title mb-0">{step.label}</p>
                      <p className="order-track-timeline__desc small text-muted mb-0">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section className="order-track-details">
            {!pickup && riderName ? (
              <p className="small mb-2">
                <i className="bi bi-person-badge me-1" aria-hidden="true" />
                Rider: <strong>{riderName}</strong>
              </p>
            ) : null}
            <p className="small mb-0">
              <i className="bi bi-geo-alt me-1" aria-hidden="true" />
              {row.barangay}
            </p>
          </section>

          {showRating && ratingsOn ? (
            <section id="rate" className="order-track-rate" aria-labelledby="rate-heading">
              {myRating ? (
                <>
                  <h2 id="rate-heading" className="order-track-rate__title">
                    <i className="bi bi-star-fill" aria-hidden="true" /> Your rating
                  </h2>
                  {sp.rated === "1" ? (
                    <p className="order-track-rate__thanks">Thanks for your feedback!</p>
                  ) : null}
                  <dl className="order-track-rate__given">
                    <dt>Food</dt>
                    <dd>
                      <Stars value={myRating.food_rating} />
                    </dd>
                    {myRating.rider_rating ? (
                      <>
                        <dt>Rider</dt>
                        <dd>
                          <Stars value={myRating.rider_rating} />
                        </dd>
                      </>
                    ) : null}
                  </dl>
                  {myRating.comment ? <p className="order-track-rate__comment">“{myRating.comment}”</p> : null}
                </>
              ) : (
                <>
                  <h2 id="rate-heading" className="order-track-rate__title">
                    <i className="bi bi-star" aria-hidden="true" /> Rate your order
                  </h2>
                  <RateOrderForm
                    orderId={orderId}
                    shopName={shopName}
                    riderName={!pickup && row.rider_id ? riderName ?? "your rider" : null}
                  />
                </>
              )}
            </section>
          ) : null}

          <div className="order-track-actions">
            {row.rider_id && String(row.order_status).toLowerCase() !== "cancelled" ? (
              <Link href={`/order-chat/${orderId}`} className="btn btn-outline-dark">
                <i className="bi bi-chat-dots me-1" aria-hidden="true" />
                Message rider
              </Link>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                className="btn btn-outline-danger"
                data-kk-cancel-order={orderId}
                data-kk-cancel-redirect={`/order-track/${orderId}`}
              >
                Cancel order
              </button>
            ) : null}
            <Link href="/my-orders" className="btn btn-dark">
              All orders
            </Link>
          </div>
        </div>
      </main>
      <CancelOrderModal />
    </>
  );
}
