import Link from "next/link";
import { riderUpdateDelivery } from "@/app/rider/actions";
import { RiderStatusSelect } from "@/components/rider/rider-status-select";

type Props = {
  orderId: number;
  deliveryStatus: string;
  compact?: boolean;
  redirectBack: string;
  proofUrl?: string | null;
  proofNote?: string | null;
  proofAt?: string | null;
};

export function RiderDeliveryActions({
  orderId,
  deliveryStatus,
  compact = false,
  redirectBack,
  proofUrl,
  proofNote,
  proofAt,
}: Props) {
  const isDelivered = deliveryStatus === "delivered";
  const completeUrl = `/rider/order/${orderId}/complete`;

  const nextStatus =
    deliveryStatus === "assigned"
      ? "picked_up"
      : deliveryStatus === "picked_up"
        ? "on_the_way"
        : deliveryStatus === "on_the_way"
          ? "delivered"
          : null;

  const nextLabel =
    deliveryStatus === "assigned"
      ? compact
        ? "Picked up"
        : "Picked up from restaurant"
      : deliveryStatus === "picked_up"
        ? compact
          ? "On the way"
          : "On the way to customer"
        : deliveryStatus === "on_the_way"
          ? "Mark complete"
          : null;

  const nextIcon =
    deliveryStatus === "assigned"
      ? "bi-bag-check"
      : deliveryStatus === "picked_up"
        ? "bi-bicycle"
        : deliveryStatus === "on_the_way"
          ? "bi-check-circle-fill"
          : null;

  if (orderId < 1) return null;

  return (
    <div
      className={`rider-delivery-actions${compact ? " rider-delivery-actions--compact" : ""}${isDelivered ? " rider-delivery-actions--done" : ""}`}
    >
      {isDelivered ? (
        <>
          <p className="rider-delivery-actions__done" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <span>Order received by customer — delivery complete.</span>
          </p>
          {proofUrl ? (
            <div className="rider-proof-display">
              <p className="rider-proof-display__label small fw-semibold text-muted mb-2">
                Proof of delivery
              </p>
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rider-proof-display__link"
              >
                <img
                  src={proofUrl}
                  alt={`Proof of delivery for order #${orderId}`}
                  className="rider-proof-display__img"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              {proofNote ? (
                <p className="rider-proof-display__note small mb-0 mt-2">{proofNote}</p>
              ) : null}
              {proofAt ? (
                <p className="rider-proof-display__time small text-muted mb-0 mt-1">
                  {new Date(proofAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {!compact ? (
            <>
              <p className="rider-delivery-actions__hint">
                Tap the button at each step. When the customer has the order, mark it complete.
              </p>
              <ol className="rider-delivery-steps" aria-label="Delivery progress">
                {(() => {
                  const stepKeys = ["assigned", "picked_up", "on_the_way", "delivered"] as const;
                  const labels: Record<(typeof stepKeys)[number], string> = {
                    assigned: "Assigned",
                    picked_up: "Picked up",
                    on_the_way: "On the way",
                    delivered: "Complete",
                  };
                  const rawIdx = stepKeys.indexOf(
                    deliveryStatus as (typeof stepKeys)[number]
                  );
                  const currentIdx = rawIdx >= 0 ? rawIdx : 0;
                  return stepKeys.map((key, idx) => {
                    const state =
                      idx < currentIdx ? "done" : idx === currentIdx ? "current" : "upcoming";
                    return (
                      <li
                        key={key}
                        className={`rider-delivery-steps__item rider-delivery-steps__item--${state}`}
                      >
                        <span className="rider-delivery-steps__dot" aria-hidden="true" />
                        <span>{labels[key]}</span>
                      </li>
                    );
                  });
                })()}
              </ol>
            </>
          ) : null}

          {nextStatus !== null && nextLabel !== null ? (
            nextStatus === "delivered" ? (
              <Link
                href={completeUrl}
                className="btn rider-delivery-actions__btn rider-delivery-actions__btn--complete"
              >
                {nextIcon ? <i className={`bi ${nextIcon}`} aria-hidden="true" /> : null}
                <span>{nextLabel}</span>
              </Link>
            ) : (
              <form action={riderUpdateDelivery} className="rider-delivery-actions__form">
                <input type="hidden" name="order_id" value={orderId} />
                <input type="hidden" name="delivery_status" value={nextStatus} />
                <input type="hidden" name="redirect" value={redirectBack} />
                <button type="submit" className="btn rider-delivery-actions__btn btn-dark">
                  {nextIcon ? <i className={`bi ${nextIcon}`} aria-hidden="true" /> : null}
                  <span>{nextLabel}</span>
                </button>
              </form>
            )
          ) : null}

          {!compact && deliveryStatus !== "on_the_way" ? (
            <p className="rider-delivery-actions__skip mb-0 mt-2 text-center">
              <Link href={completeUrl} className="rider-delivery-actions__skip-btn">
                Mark complete with photo
              </Link>
            </p>
          ) : null}

          <details className="rider-delivery-actions__more">
            <summary className="rider-delivery-actions__more-summary">Change status manually</summary>
            <RiderStatusSelect
              orderId={orderId}
              redirectBack={redirectBack}
              completeUrl={completeUrl}
            />
          </details>
        </>
      )}
    </div>
  );
}
