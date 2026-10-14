import Link from "next/link";
import { Stars } from "@/components/stars";
import {
  customerCanCancel,
  customerDeliveryStatusLabel,
  customerTrackingSteps,
  formatCustomerOrderDate,
  type CustomerOrderRow,
} from "@/lib/customer-orders";

export type CustomerOrderWithMeta = CustomerOrderRow & {
  chatUnread?: number;
  /** Delivered and ratings are switched on. */
  rateable?: boolean;
  /** Food stars the customer gave, if already rated. */
  myFoodRating?: number | null;
};

type Props = {
  orders: CustomerOrderWithMeta[];
  flash?: { kind: "success" | "warning"; message: string } | null;
};

export function MyOrdersView({ orders, flash }: Props) {
  return (
    <main className="my-orders-page">
      <div className="my-orders-page__inner">
        <header className="my-orders-page__intro">
          <p className="my-orders-page__kicker">Your account</p>
          <h1 className="my-orders-page__title">My orders</h1>
          <p className="my-orders-page__lede">
            Track delivery status or cancel while your order is still being prepared.
          </p>
        </header>

        {flash ? (
          <div
            className={`alert alert-${flash.kind === "success" ? "success" : "warning"} mb-3`}
            role={flash.kind === "success" ? "status" : "alert"}
          >
            {flash.message}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <div className="my-orders-empty-card" role="status">
            <i className="bi bi-inbox my-orders-empty__icon" aria-hidden="true" />
            <p className="my-orders-empty__text">You have no orders yet.</p>
            <Link href="/#shops" className="btn btn-sm btn-dark my-orders-empty__cta">
              Browse shops
            </Link>
          </div>
        ) : (
          <ul className="my-orders-list">
            {orders.map((order) => {
              const orderId = order.id;
              const statusKey = String(order.order_status ?? "").toLowerCase();
              const isCancelled = statusKey === "cancelled";
              const steps = customerTrackingSteps(order);
              const canCancel = customerCanCancel(order);
              const shopName = order.restaurants?.name ?? "Shop";
              const unread = order.chatUnread ?? 0;

              return (
                <li
                  key={orderId}
                  className={`my-orders-card${isCancelled ? " my-orders-card--cancelled" : ""}`}
                >
                  <div className="my-orders-card__top">
                    <div>
                      <p className="my-orders-card__id mb-0">Order #{orderId}</p>
                      <p className="my-orders-card__shop mb-0">{shopName}</p>
                    </div>
                    <p className="my-orders-card__total tabular-nums mb-0">
                      ₱{Number(order.total).toFixed(2)}
                    </p>
                  </div>

                  <p className="my-orders-card__status">{customerDeliveryStatusLabel(order)}</p>

                  {!isCancelled ? (
                    <ol
                      className="my-orders-mini-track"
                      aria-label={`Order progress for order ${orderId}`}
                    >
                      {steps
                        .filter((s) => s.key !== "cancelled")
                        .map((step) => (
                          <li
                            key={step.key}
                            className={`my-orders-mini-track__step my-orders-mini-track__step--${step.state}`}
                            title={step.label}
                          >
                            <span className="visually-hidden">{step.label}</span>
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <p className="small text-muted mb-2">
                      {order.cancel_reason ?? "Order cancelled"}
                    </p>
                  )}

                  <p className="my-orders-card__meta small text-muted mb-0">
                    {formatCustomerOrderDate(order.created_at)}
                    {" · "}
                    {String(order.payment_method).toUpperCase()}
                    {order.payment_status === "paid" ? (
                      <>
                        {" · "}
                        <span className="text-success">Paid</span>
                      </>
                    ) : null}
                  </p>

                  <div className="my-orders-card__actions">
                    <Link href={`/order-track/${orderId}`} className="btn btn-sm btn-dark">
                      <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                      Track order
                    </Link>
                    <Link href={`/order-track/${orderId}/receipt`} className="btn btn-sm btn-outline-dark">
                      <i className="bi bi-receipt me-1" aria-hidden="true" />
                      Receipt
                    </Link>
                    {order.rateable ? (
                      order.myFoodRating ? (
                        <Link
                          href={`/order-track/${orderId}#rate`}
                          className="my-orders-rated"
                          aria-label={`You rated this order ${order.myFoodRating} out of 5`}
                        >
                          <Stars value={order.myFoodRating} size="sm" label="" />
                        </Link>
                      ) : (
                        <Link href={`/order-track/${orderId}#rate`} className="btn btn-sm btn-warning my-orders-rate-btn">
                          <i className="bi bi-star-fill me-1" aria-hidden="true" />
                          Rate
                        </Link>
                      )
                    ) : null}
                    {order.rider_id && !isCancelled ? (
                      <Link
                        href={`/order-chat/${orderId}`}
                        className="btn btn-sm btn-outline-dark my-orders-msg-btn"
                      >
                        <i className="bi bi-chat-dots" aria-hidden="true" />
                        {unread > 0 ? (
                          <span className="my-orders-msg-badge">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        ) : null}
                      </Link>
                    ) : null}
                    {canCancel ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        data-kk-cancel-order={orderId}
                        data-kk-cancel-redirect="/my-orders"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
