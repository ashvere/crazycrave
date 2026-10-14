import Link from "next/link";
import type { RiderOrderRow } from "@/lib/rider-data";
import { mapsDestination } from "@/lib/rider-maps";
import {
  riderDeliveryStatusMeta,
  riderOrderStatusMeta,
} from "@/lib/rider-meta";
import { RiderDeliveryActions } from "@/components/rider/rider-delivery-actions";

type Props = {
  orders: RiderOrderRow[];
  riderName: string;
  /** Unread customer messages by order id. */
  chatUnread?: Record<number, number>;
};

export function RiderDashboard({ orders, riderName, chatUnread = {} }: Props) {
  const totalCount = orders.length;
  const activeCount = orders.filter(
    (o) => (o.delivery_status ?? "") !== "delivered"
  ).length;
  const doneCount = totalCount - activeCount;

  return (
    <main className="rider-dash-page">
      <div className="container-fluid rider-dash-page__inner">
        <header className="rider-dash-hero">
          <div className="rider-dash-hero__copy">
            <p className="rider-dash-header__kicker">Delivery partner</p>
            <h1 className="rider-dash-header__title">Hi, {riderName}</h1>
            <p className="rider-dash-header__lede">
              Orders assigned to you by the kitchen. Update status as you go.
            </p>
          </div>
          <div className="rider-dash-stats" aria-label="Delivery summary">
            <div className="rider-dash-stat">
              <span className="rider-dash-stat__value tabular-nums">{totalCount}</span>
              <span className="rider-dash-stat__label">Total</span>
            </div>
            <div className="rider-dash-stat rider-dash-stat--active">
              <span className="rider-dash-stat__value tabular-nums">{activeCount}</span>
              <span className="rider-dash-stat__label">Active</span>
            </div>
            <div className="rider-dash-stat rider-dash-stat--done">
              <span className="rider-dash-stat__value tabular-nums">{doneCount}</span>
              <span className="rider-dash-stat__label">Delivered</span>
            </div>
          </div>
        </header>

        <section className="rider-dash-section" aria-labelledby="rider-deliveries-heading">
          <h2 id="rider-deliveries-heading" className="rider-dash-section__title">
            <i className="bi bi-truck" aria-hidden="true" />
            <span>My deliveries</span>
          </h2>

          {orders.length === 0 ? (
            <div className="rider-dash-empty-card" role="status">
              <div className="rider-dash-empty-card__icon" aria-hidden="true">
                <i className="bi bi-inbox" />
              </div>
              <h3 className="rider-dash-empty-card__title">No deliveries yet</h3>
              <p className="rider-dash-empty-card__text">
                The shop will assign orders to you when they&apos;re ready for pickup.
              </p>
            </div>
          ) : (
            <ul className="rider-delivery-list">
              {orders.map((o) => {
                const deliveryStatus = o.delivery_status ?? "assigned";
                const delMeta = riderDeliveryStatusMeta(deliveryStatus);
                const ordMeta = riderOrderStatusMeta(o.order_status ?? "pending");
                const mapsDest = mapsDestination(o.delivery_address, o.barangay ?? "");
                const placed = o.created_at
                  ? new Date(o.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";
                const isPool = !o.rider_id;
                return (
                  <li
                    key={o.id}
                    className={`rider-delivery-card${isPool ? " rider-delivery-card--pool" : ""}`}
                  >
                    <div className="rider-delivery-card__top">
                      <div className="rider-delivery-card__id">
                        <span className="rider-delivery-card__hash">#</span>
                        {o.id}
                      </div>
                      <span className="rider-delivery-card__total tabular-nums">
                        ₱{Number(o.total).toFixed(2)}
                      </span>
                    </div>
                    {placed !== "" ? (
                      <p className="rider-delivery-card__time">{placed}</p>
                    ) : null}
                    <div className="rider-delivery-card__badges">
                      {isPool ? (
                        <span className="rider-pill rider-pill--new">New order</span>
                      ) : null}
                      <span className={`rider-pill ${ordMeta.className}`}>{ordMeta.label}</span>
                      <span className={`rider-pill ${delMeta.className}`}>{delMeta.label}</span>
                    </div>
                    {(chatUnread[o.id] ?? 0) > 0 ? (
                      <Link href={`/rider/order/${o.id}/chat`} className="rider-msg-chip">
                        <i className="bi bi-chat-dots-fill" aria-hidden="true" />
                        {chatUnread[o.id]} new message{chatUnread[o.id] === 1 ? "" : "s"} from customer
                        <i className="bi bi-chevron-right ms-auto" aria-hidden="true" />
                      </Link>
                    ) : null}
                    {o.barangay ? (
                      <p className="rider-delivery-card__location">
                        <i className="bi bi-geo-alt" aria-hidden="true" />
                        <span>{o.barangay}</span>
                      </p>
                    ) : null}
                    <div className="rider-btn-row">
                      <Link href={`/rider/order/${o.id}`} className="rider-btn rider-btn--light">
                        <i className="bi bi-card-list" aria-hidden="true" />
                        Details
                      </Link>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsDest)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rider-btn rider-btn--light"
                      >
                        <i className="bi bi-map" aria-hidden="true" />
                        Map
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDest)}&travelmode=two_wheeler`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rider-btn rider-btn--gold"
                      >
                        <i className="bi bi-sign-turn-right" aria-hidden="true" />
                        Navigate
                      </a>
                    </div>
                    <div className="rider-delivery-card__actions">
                      <RiderDeliveryActions
                        orderId={o.id}
                        deliveryStatus={deliveryStatus}
                        compact
                        redirectBack="/rider"
                        proofUrl={o.delivery_proof_url}
                        proofNote={o.delivery_proof_note}
                        proofAt={o.delivery_proof_at}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
