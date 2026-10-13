import Link from "next/link";
import type { RiderOrderItemRow, RiderOrderRow } from "@/lib/rider-data";
import { mapsDestination } from "@/lib/rider-maps";
import {
  riderDeliveryStatusMeta,
  riderOrderStatusMeta,
} from "@/lib/rider-meta";
import { RiderDeliveryActions } from "@/components/rider/rider-delivery-actions";

type Props = {
  order: RiderOrderRow;
  items: RiderOrderItemRow[];
};

export function RiderOrderDetail({ order, items }: Props) {
  const oid = order.id;
  const deliveryStatus = order.delivery_status ?? "assigned";
  const delMeta = riderDeliveryStatusMeta(deliveryStatus);
  const ordMeta = riderOrderStatusMeta(order.order_status ?? "pending");
  const addr = order.delivery_address ?? "";
  const mapsDest = mapsDestination(addr, order.barangay ?? "");
  const redirectBack = `/rider/order/${oid}`;

  return (
    <main className="rider-dash-page">
      <div className="container-fluid rider-dash-page__inner">
        <header className="rider-dash-header mb-3">
          <Link href="/rider" className="rider-login-panel__back d-inline-flex">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            <span>All deliveries</span>
          </Link>
          <p className="rider-dash-header__kicker mt-3">Order details</p>
          <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
            <h1 className="rider-dash-header__title mb-0">Order #{oid}</h1>
            <span className={`rider-pill ${delMeta.className}`}>{delMeta.label}</span>
          </div>
        </header>

        <div className="rider-dash-surface p-3 p-md-4 mb-3">
          <dl className="rider-dash-detail-grid">
            <dt>Customer</dt>
            <dd className="fw-medium">{order.customer_display_name || "Customer"}</dd>
            {order.customer_phone ? (
              <>
                <dt>Contact</dt>
                <dd className="d-flex flex-wrap align-items-center gap-2">
                  <span className="tabular-nums fw-medium">{order.customer_phone}</span>
                  <a href={`tel:${order.customer_phone}`} className="btn btn-sm btn-success rounded-pill">
                    <i className="bi bi-telephone-fill me-1" aria-hidden="true" />
                    Call
                  </a>
                  <a href={`sms:${order.customer_phone}`} className="btn btn-sm btn-outline-secondary rounded-pill">
                    <i className="bi bi-chat-text me-1" aria-hidden="true" />
                    Text
                  </a>
                </dd>
              </>
            ) : null}
            <dt>Barangay</dt>
            <dd>{order.barangay}</dd>
            <dt>Address</dt>
            <dd className="small" style={{ whiteSpace: "pre-wrap" }}>
              {addr}
            </dd>
            <dt>Payment</dt>
            <dd>{String(order.payment_method ?? "").toUpperCase()}</dd>
            <dt>Kitchen status</dt>
            <dd>
              <span className={`rider-pill ${ordMeta.className}`}>{ordMeta.label}</span>
            </dd>
            <dt>Total</dt>
            <dd className="tabular-nums fw-bold fs-5">₱{Number(order.total).toFixed(2)}</dd>
          </dl>
          <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
            <Link
              href={`/rider/order/${oid}/chat`}
              className="btn btn-sm btn-dark rider-btn-pill"
            >
              <i className="bi bi-chat-dots me-1" aria-hidden="true" />
              Chat with customer
            </Link>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsDest)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary rider-btn-pill"
            >
              <i className="bi bi-map me-1" aria-hidden="true" />
              Map
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDest)}&travelmode=two_wheeler`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm rider-btn-pill rider-btn-nav"
            >
              <i className="bi bi-sign-turn-right me-1" aria-hidden="true" />
              Navigate
            </a>
            <span className="btn btn-sm btn-outline-secondary rider-btn-pill disabled">
              <i className="bi bi-chat-dots me-1" aria-hidden="true" />
              Message (PHP chat)
            </span>
          </div>
        </div>

        <div className="rider-dash-surface p-3 p-md-4 mb-3">
          <h2 className="h6 fw-bold mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-truck text-warning" aria-hidden="true" />
            <span>Delivery status</span>
          </h2>
          <RiderDeliveryActions
            orderId={oid}
            deliveryStatus={deliveryStatus}
            redirectBack={redirectBack}
            proofUrl={order.delivery_proof_url}
            proofNote={order.delivery_proof_note}
            proofAt={order.delivery_proof_at}
          />
        </div>

        <div className="rider-dash-surface">
          <div className="px-3 py-3 border-bottom bg-light-subtle">
            <h2 className="h6 mb-0 fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-bag-check text-warning" aria-hidden="true" />
              <span>Items</span>
            </h2>
          </div>
          <div className="table-responsive">
            <table className="table rider-dash-table mb-0">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="text-end">
                    Qty
                  </th>
                  <th scope="col" className="text-end">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="fw-medium">{i.menu_name || `Menu #${i.menu_id}`}</td>
                    <td className="text-end tabular-nums">{i.quantity}</td>
                    <td className="text-end tabular-nums">₱{Number(i.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
