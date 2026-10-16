import { Fragment } from "react";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { addressOnly, gcashReference, orderReference, type ReceiptOrder } from "@/lib/receipt";
import { ReceiptActions } from "@/components/receipt-actions";
import { riderFeeBreakdown } from "@/lib/checkout";

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT: Record<string, string> = { cod: "Cash", gcash: "GCash" };

/** Printable order receipt with reference number, shared by the customer and staff portals. */
export function Receipt({ order }: { order: ReceiptOrder }) {
  const reference = orderReference(order.id, order.created_at);
  const gcashRef = gcashReference(order.delivery_address);
  const pickup = /pickup/i.test(`${order.barangay} ${order.delivery_address}`);
  const subtotal = order.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const fee = Number(order.rider_fee) || 0;
  const priority = order.delivery_address.includes("Delivery option: Priority");
  const feeLines = riderFeeBreakdown(order.distance_km, priority ? "priority" : "standard");
  // Orders priced under an older fee rule won't add up; show just the total for those.
  const showFeeLines =
    fee > 0 && order.distance_km > 0 && feeLines.reduce((s, l) => s + l.amount, 0) === fee;
  const placed = new Date(order.created_at).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="kk-receipt bg-white border rounded-3 p-3 p-sm-4 mx-auto" style={{ maxWidth: 480 }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .kk-receipt, .kk-receipt * { visibility: visible !important; }
          .kk-receipt { position: absolute; inset: 0 auto auto 0; width: 100%; max-width: none !important; border: 0 !important; }
          .kk-receipt-noprint { display: none !important; }
        }
      `}</style>

      <header className="text-center mb-3">
        <img src={BRAND_LOGO_SRC} alt="" width={48} height={48} className="mb-2" />
        <h1 className="h5 fw-bold mb-0">{order.shopName}</h1>
        <p className="small text-muted mb-0">Crispy Crave · Official receipt</p>
      </header>

      <section className="text-center border rounded-3 py-2 mb-3" aria-label="Reference number">
        <p className="small text-muted mb-0">Reference number</p>
        <p className="h5 fw-bold font-monospace mb-0">{reference}</p>
        <p className="small text-muted mb-0">
          Order #{order.id} · {placed}
        </p>
      </section>

      <dl className="row small mb-3">
        <dt className="col-5 text-muted fw-normal">Customer</dt>
        <dd className="col-7 mb-1 text-end">{order.customer_display_name}</dd>
        {order.customer_phone ? (
          <>
            <dt className="col-5 text-muted fw-normal">Phone</dt>
            <dd className="col-7 mb-1 text-end tabular-nums">{order.customer_phone}</dd>
          </>
        ) : null}
        <dt className="col-5 text-muted fw-normal">{pickup ? "Fulfillment" : "Deliver to"}</dt>
        <dd className="col-7 mb-1 text-end">
          {pickup ? "Pickup" : [addressOnly(order.delivery_address), order.barangay].filter(Boolean).join(", ")}
        </dd>
      </dl>

      <table className="table table-sm small align-middle mb-2">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className="text-end">Qty</th>
            <th scope="col" className="text-end">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, idx) => (
            <tr key={idx}>
              <td>
                {i.menu_name}
                <div className="text-muted">{peso(Number(i.price))} each</div>
              </td>
              <td className="text-end tabular-nums">{i.quantity}</td>
              <td className="text-end tabular-nums">{peso(Number(i.price) * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="row small mb-0">
        <dt className="col-7 text-muted fw-normal">Subtotal</dt>
        <dd className="col-5 mb-1 text-end tabular-nums">{peso(subtotal)}</dd>
        {fee > 0 ? (
          <>
            <dt className="col-7 text-muted fw-normal">
              Delivery fee
              {order.distance_km > 0 ? <span className="ms-1">({order.distance_km} km)</span> : null}
            </dt>
            <dd className="col-5 mb-1 text-end tabular-nums">{peso(fee)}</dd>
            {showFeeLines
              ? feeLines.map((l) => (
                  <Fragment key={l.label}>
                    <dt className="col-7 text-muted fw-normal ps-4 fst-italic">{l.label}</dt>
                    <dd className="col-5 mb-1 text-end text-muted tabular-nums">{peso(l.amount)}</dd>
                  </Fragment>
                ))
              : null}
          </>
        ) : null}
        <dt className="col-7 fw-bold fs-6">Total</dt>
        <dd className="col-5 mb-2 text-end fw-bold fs-6 tabular-nums">{peso(Number(order.total))}</dd>
        <dt className="col-7 text-muted fw-normal">Payment</dt>
        <dd className="col-5 mb-1 text-end">
          {PAYMENT[order.payment_method] ?? order.payment_method} ·{" "}
          <span className="text-capitalize">{order.payment_status}</span>
        </dd>
        {gcashRef ? (
          <>
            <dt className="col-7 text-muted fw-normal">GCash ref</dt>
            <dd className="col-5 mb-1 text-end font-monospace">{gcashRef}</dd>
          </>
        ) : null}
        <dt className="col-7 text-muted fw-normal">Order status</dt>
        <dd className="col-5 mb-0 text-end text-capitalize">{order.order_status}</dd>
      </dl>

      <hr />
      <p className="small text-muted text-center mb-3">
        Keep your reference number for support or payment follow-up.
      </p>
      <div className="d-flex justify-content-center">
        <ReceiptActions reference={reference} />
      </div>
    </article>
  );
}
