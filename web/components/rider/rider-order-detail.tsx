import Link from "next/link";
import type { RiderOrderItemRow, RiderOrderRow } from "@/lib/rider-data";
import { mapsDestination } from "@/lib/rider-maps";
import {
  riderDeliveryOptionMeta,
  riderDeliveryStatusMeta,
  riderOrderStatusMeta,
} from "@/lib/rider-meta";
import { RiderDeliveryActions } from "@/components/rider/rider-delivery-actions";

type Props = {
  order: RiderOrderRow;
  items: RiderOrderItemRow[];
  chatUnread?: number;
};

const PAYMENT: Record<string, { label: string; icon: string }> = {
  cod: { label: "Cash on delivery", icon: "bi-cash-coin" },
  gcash: { label: "GCash", icon: "bi-phone" },
  bank: { label: "Bank transfer", icon: "bi-bank" },
  card: { label: "Card", icon: "bi-credit-card" },
};

const peso = (n: number) => `₱${Number(n).toFixed(2)}`;

/** Address without the "Customer notes: …" block that checkout appends. */
function splitAddress(full: string): { address: string; notes: string | null } {
  // Delivery type is shown as its own row, so drop the lines checkout appends for it.
  const raw = full.replace(/\n\n(Delivery option: [^\n]*|Scheduled delivery: [^\n]*|Fulfillment: Store pickup)/g, "");
  const i = raw.indexOf("\n\nCustomer notes: ");
  if (i < 0) return { address: raw.replace(/\n\nContact: [^\n]+\s*$/, "").trim(), notes: null };
  return {
    address: raw.slice(0, i).trim(),
    notes: raw.slice(i + "\n\nCustomer notes: ".length).replace(/\n\nContact: [^\n]+\s*$/, "").trim() || null,
  };
}

export function RiderOrderDetail({ order, items, chatUnread = 0 }: Props) {
  const oid = order.id;
  const deliveryStatus = order.delivery_status ?? "assigned";
  const delMeta = riderDeliveryStatusMeta(deliveryStatus);
  const ordMeta = riderOrderStatusMeta(order.order_status ?? "pending");
  const raw = order.delivery_address ?? "";
  const { address, notes } = splitAddress(raw);
  const barangay = order.barangay ?? "";
  const mapsDest = mapsDestination(raw, barangay);
  const redirectBack = `/rider/order/${oid}`;
  const pay = PAYMENT[String(order.payment_method ?? "").toLowerCase()] ?? {
    label: String(order.payment_method ?? "—"),
    icon: "bi-wallet2",
  };
  const isCod = String(order.payment_method ?? "").toLowerCase() === "cod";
  const optMeta = riderDeliveryOptionMeta(raw, barangay);
  const riderFee = Number(order.rider_fee ?? 0) || 0;
  const distanceKm = Number(order.distance_km ?? 0) || 0;

  return (
    <main className="rider-dash-page">
      <div className="container-fluid rider-dash-page__inner">
        <Link href="/rider" className="rider-back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>All deliveries</span>
        </Link>

        <header className="rider-od-head">
          <div>
            <p className="rider-dash-header__kicker">Order details</p>
            <h1 className="rider-dash-header__title">Order #{oid}</h1>
          </div>
          <div className="rider-od-head__pills">
            <span className={`rider-pill ${delMeta.className}`}>{delMeta.label}</span>
            <span className={`rider-pill ${ordMeta.className}`}>Kitchen: {ordMeta.label}</span>
            <span className={`rider-pill ${optMeta.className}`}>
              <i className={`bi ${optMeta.icon} me-1`} aria-hidden="true" />
              {optMeta.label}
            </span>
          </div>
        </header>

        <section className="rider-card">
          <div className="rider-od-customer">
            <span className="rider-od-customer__avatar" aria-hidden="true">
              {(order.customer_display_name || "C").charAt(0).toUpperCase()}
            </span>
            <div className="rider-od-customer__main">
              <p className="rider-od-customer__name">{order.customer_display_name || "Customer"}</p>
              {order.customer_phone ? (
                <p className="rider-od-customer__phone tabular-nums">{order.customer_phone}</p>
              ) : null}
            </div>
            {order.customer_phone ? (
              <a href={`sms:${order.customer_phone}`} className="rider-btn rider-btn--dark rider-btn--sm">
                <i className="bi bi-chat-dots-fill" aria-hidden="true" />
                Message
              </a>
            ) : null}
          </div>

          <dl className="rider-od-rows">
            <div className="rider-od-row">
              <dt>
                <i className="bi bi-geo-alt" aria-hidden="true" /> Drop-off
              </dt>
              <dd>
                <span className="fw-semibold">{address || "—"}</span>
                {barangay && barangay.toLowerCase() !== address.toLowerCase() ? (
                  <span className="rider-od-row__sub">{barangay}</span>
                ) : null}
              </dd>
            </div>
            {notes ? (
              <div className="rider-od-row">
                <dt>
                  <i className="bi bi-chat-left-text" aria-hidden="true" /> Notes
                </dt>
                <dd className="rider-od-note">{notes}</dd>
              </div>
            ) : null}
            <div className="rider-od-row">
              <dt>
                <i className={`bi ${pay.icon}`} aria-hidden="true" /> Payment
              </dt>
              <dd>{pay.label}</dd>
            </div>
            <div className="rider-od-row">
              <dt>
                <i className={`bi ${optMeta.icon}`} aria-hidden="true" /> Delivery type
              </dt>
              <dd>{optMeta.label}</dd>
            </div>
            <div className="rider-od-row">
              <dt>
                <i className="bi bi-wallet2" aria-hidden="true" /> Your fee
              </dt>
              <dd>
                <span className="fw-semibold tabular-nums">{peso(riderFee)}</span>
                {distanceKm > 0 ? (
                  <span className="rider-od-row__sub tabular-nums">
                    {distanceKm} km
                    {optMeta.label === "Priority" ? " · includes ₱30 priority bonus" : ""}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="rider-od-row rider-od-row--total">
              <dt>
                <i className="bi bi-receipt" aria-hidden="true" /> {isCod ? "Collect" : "Total"}
              </dt>
              <dd className="tabular-nums">{peso(order.total)}</dd>
            </div>
          </dl>

          <div className="rider-btn-row">
            <Link
              href={`/rider/order/${oid}/chat`}
              className="rider-btn rider-btn--dark"
              aria-label={chatUnread > 0 ? `Chat, ${chatUnread} new message${chatUnread === 1 ? "" : "s"}` : undefined}
            >
              <i className="bi bi-chat-dots" aria-hidden="true" />
              Chat
              {chatUnread > 0 ? <span className="rider-count" aria-hidden="true">{chatUnread}</span> : null}
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
        </section>

        <section className="rider-card">
          <h2 className="rider-card__title">
            <i className="bi bi-truck" aria-hidden="true" />
            Delivery status
          </h2>
          <RiderDeliveryActions
            orderId={oid}
            deliveryStatus={deliveryStatus}
            redirectBack={redirectBack}
            proofUrl={order.delivery_proof_url}
            proofNote={order.delivery_proof_note}
            proofAt={order.delivery_proof_at}
          />
        </section>

        <section className="rider-card">
          <h2 className="rider-card__title">
            <i className="bi bi-bag-check" aria-hidden="true" />
            Items
            <span className="rider-card__title-meta">
              {items.reduce((s, i) => s + i.quantity, 0)} item
              {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "" : "s"}
            </span>
          </h2>
          <ul className="rider-items">
            {items.map((i) => (
              <li key={i.id} className="rider-items__row">
                <span className="rider-items__qty tabular-nums">{i.quantity}×</span>
                <span className="rider-items__name">{i.menu_name || `Menu #${i.menu_id}`}</span>
                <span className="rider-items__price tabular-nums">{peso(Number(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
