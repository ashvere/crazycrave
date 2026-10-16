"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrder } from "@/app/(store)/checkout/actions";
import { DigitsInput } from "@/components/store/digits-input";
import {
  BARANGAY_DISTANCES,
  PRIORITY_SURCHARGE,
  STORE_PICKUP_BARANGAY,
  riderFeeFor,
  type DeliveryOption,
  type PaymentOption,
} from "@/lib/checkout";

export type CheckoutLine = { menu_id: number; name: string; price: number; qty: number };

export type CheckoutInitial = {
  fulfillment: "delivery" | "pickup";
  barangay: string;
  address: string;
  phone: string;
  time: string;
  notes: string;
  deliveryOption: DeliveryOption;
  payment: PaymentOption;
  scheduleDate: string;
  scheduleTime: string;
  fromPrefill: boolean;
};

const peso = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BARANGAY_NAMES = Object.keys(BARANGAY_DISTANCES).filter((b) => b !== STORE_PICKUP_BARANGAY);

const DELIVERY_CHOICES: { value: DeliveryOption; name: string; meta: string }[] = [
  { value: "standard", name: "Standard", meta: "20 – 35 mins" },
  { value: "priority", name: "Priority", meta: `40 – 55 mins · + ₱${PRIORITY_SURCHARGE} rider fee` },
  { value: "scheduled", name: "Scheduled", meta: "Choose a date & time below" },
];

const PAYMENT_CHOICES: { value: PaymentOption; name: string; icon: string }[] = [
  { value: "cod", name: "Cash on delivery", icon: "bi-cash-coin" },
];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-dark btn-lg w-100 checkout-page__submit rounded-pill fw-semibold"
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Placing order…
        </>
      ) : (
        <>
          <i className="bi bi-check2-circle me-2" aria-hidden="true" />
          Place order
        </>
      )}
    </button>
  );
}

export function CheckoutForm({
  lines,
  initial,
  today,
}: {
  lines: CheckoutLine[];
  initial: CheckoutInitial;
  today: string;
}) {
  const pickup = initial.fulfillment === "pickup";
  const [barangay, setBarangay] = useState(pickup ? STORE_PICKUP_BARANGAY : initial.barangay);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>(initial.deliveryOption);
  const [payment, setPayment] = useState<PaymentOption>(initial.payment);

  const foodTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const validBarangay = Object.prototype.hasOwnProperty.call(BARANGAY_DISTANCES, barangay);
  const riderFee = pickup ? 0 : validBarangay ? riderFeeFor(BARANGAY_DISTANCES[barangay]!, deliveryOption) : null;

  const suggestions = useMemo(() => {
    const q = barangay.trim().toLowerCase();
    if (!q || validBarangay) return [];
    return BARANGAY_NAMES.filter((b) => b.toLowerCase().includes(q));
  }, [barangay, validBarangay]);

  return (
    <div className="checkout-page__layout">
      <aside className="checkout-page__summary" aria-labelledby="checkout-summary-heading">
        <div className="checkout-page__surface">
          <div className="checkout-page__summary-head">
            <h2 id="checkout-summary-heading" className="checkout-page__section-title">
              <i className="bi bi-bag-check" aria-hidden="true" />
              <span>Your order</span>
            </h2>
          </div>

          <div className="table-responsive checkout-page__scroll">
            <table className="table table-hover checkout-page-table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="text-end">Qty</th>
                  <th scope="col" className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.menu_id}>
                    <td className="fw-medium">{l.name}</td>
                    <td className="text-end tabular-nums">{l.qty}</td>
                    <td className="text-end tabular-nums">₱{peso(l.price * l.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="checkout-page__totals">
            <div className="checkout-page__totals-row">
              <span className="checkout-page__totals-label">Food total</span>
              <span className="checkout-page__totals-value tabular-nums">₱{peso(foodTotal)}</span>
            </div>
            <div className="checkout-page__totals-row">
              <span className="checkout-page__totals-label">Rider fee</span>
              <span className="checkout-page__totals-value tabular-nums">
                {riderFee === null ? "Select barangay" : `₱${peso(riderFee)}`}
              </span>
            </div>
            <div className="checkout-page__totals-row checkout-page__totals-row--grand">
              <span className="checkout-page__totals-label">Grand total</span>
              <span className="checkout-page__totals-value tabular-nums">
                ₱{peso(foodTotal + (riderFee ?? 0))}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="checkout-page__main">
        <form action={placeOrder} className="checkout-page__form">
          <input type="hidden" name="fulfillment" value={initial.fulfillment} />

          {initial.fromPrefill ? (
            <div className="checkout-page__notice" role="status">
              <i className="bi bi-info-circle" aria-hidden="true" />
              <span>
                We filled in some fields from your <strong>Order now</strong> step. You can still edit
                everything below.
              </span>
            </div>
          ) : null}

          <section className="checkout-page__surface checkout-page__section" aria-labelledby="checkout-delivery-heading">
            <h2 id="checkout-delivery-heading" className="checkout-page__section-title">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <span>Delivery details</span>
            </h2>

            <div className="checkout-page__field position-relative">
              <label className="checkout-page__label" htmlFor="barangay">
                Barangay (Pototan, Iloilo only)
              </label>
              <input
                type="text"
                name="barangay"
                id="barangay"
                className={`form-control checkout-page__control${
                  !pickup && barangay && !validBarangay && !showSuggestions ? " is-invalid" : ""
                }`}
                placeholder="Type your barangay…"
                autoComplete="off"
                required
                readOnly={pickup}
                value={barangay}
                onChange={(e) => {
                  setBarangay(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {!pickup && barangay && !validBarangay && !showSuggestions ? (
                <div className="invalid-feedback">Pick your barangay from the list.</div>
              ) : null}
              {showSuggestions && suggestions.length > 0 ? (
                <div className="checkout-page__suggestions list-group">
                  {suggestions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setBarangay(b);
                        setShowSuggestions(false);
                      }}
                    >
                      {b} ({BARANGAY_DISTANCES[b]} km)
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="checkout-page__field">
              <label className="checkout-page__label" htmlFor="customer_phone">
                Mobile number
              </label>
              <DigitsInput
                type="tel"
                name="customer_phone"
                id="customer_phone"
                className="form-control checkout-page__control"
                autoComplete="tel"
                placeholder="09XXXXXXXXX"
                maxLength={11}
                pattern="0[0-9]{9,10}"
                title="Numbers only, e.g. 09171234567"
                required
                defaultValue={initial.phone}
              />
              <p className="small text-muted mt-1 mb-0">
                {pickup ? "The shop" : "Your rider"} will use this to reach you about the order.
              </p>
            </div>

            <div className="checkout-page__field">
              <label className="checkout-page__label" htmlFor="delivery_address">
                Street / landmark
              </label>
              <textarea
                name="delivery_address"
                id="delivery_address"
                className="form-control checkout-page__control"
                rows={2}
                maxLength={500}
                placeholder="House number, street, landmark…"
                required={!pickup}
                defaultValue={initial.address}
              />
            </div>

            <div className="checkout-page__field">
              <label className="checkout-page__label" htmlFor="pickup_time">
                Preferred pickup / delivery time
              </label>
              <input
                type="time"
                name="pickup_time"
                id="pickup_time"
                className="form-control checkout-page__control"
                required
                defaultValue={initial.time}
              />
            </div>

            <div className="checkout-page__field mb-0">
              <label className="checkout-page__label" htmlFor="order_notes">
                Order notes
              </label>
              <textarea
                name="order_notes"
                id="order_notes"
                className="form-control checkout-page__control"
                rows={2}
                maxLength={500}
                placeholder="Optional"
                defaultValue={initial.notes}
              />
            </div>
          </section>

          {!pickup ? (
            <section className="checkout-page__surface checkout-page__section" aria-labelledby="checkout-shipping-heading">
              <h2 id="checkout-shipping-heading" className="checkout-page__section-title">
                <i className="bi bi-truck" aria-hidden="true" />
                <span>Delivery options</span>
              </h2>

              {DELIVERY_CHOICES.map((o) => (
                <div
                  key={o.value}
                  className={`delivery-option${deliveryOption === o.value ? " active" : ""}`}
                  onClick={() => setDeliveryOption(o.value)}
                >
                  <input
                    type="radio"
                    name="delivery_option"
                    value={o.value}
                    id={`delivery_${o.value}`}
                    checked={deliveryOption === o.value}
                    onChange={() => setDeliveryOption(o.value)}
                  />
                  <label htmlFor={`delivery_${o.value}`}>
                    <span className="checkout-option__name">{o.name}</span>
                    <small className="checkout-option__meta">{o.meta}</small>
                  </label>
                </div>
              ))}

              {deliveryOption === "scheduled" ? (
                <div className="checkout-page__scheduled mt-3">
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <label className="checkout-page__label" htmlFor="schedule_date">
                        Delivery date
                      </label>
                      <input
                        type="date"
                        name="schedule_date"
                        id="schedule_date"
                        className="form-control checkout-page__control"
                        defaultValue={initial.scheduleDate}
                        min={today}
                        required
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="checkout-page__label" htmlFor="schedule_time">
                        Delivery time
                      </label>
                      <input
                        type="time"
                        name="schedule_time"
                        id="schedule_time"
                        className="form-control checkout-page__control"
                        defaultValue={initial.scheduleTime}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="checkout-page__surface checkout-page__section" aria-labelledby="checkout-payment-heading">
            <h2 id="checkout-payment-heading" className="checkout-page__section-title">
              <i className="bi bi-credit-card" aria-hidden="true" />
              <span>Payment method</span>
            </h2>

            {PAYMENT_CHOICES.map((o) => (
              <div
                key={o.value}
                className={`payment-option${payment === o.value ? " active" : ""}`}
                onClick={() => setPayment(o.value)}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={o.value}
                  id={`pay_${o.value}`}
                  checked={payment === o.value}
                  onChange={() => setPayment(o.value)}
                />
                <label htmlFor={`pay_${o.value}`}>
                  <span className="checkout-option__name">
                    <i className={`bi ${o.icon} me-1`} aria-hidden="true" />
                    {o.name}
                  </span>
                </label>
              </div>
            ))}

          </section>

          <SubmitButton disabled={!pickup && !validBarangay} />
        </form>
      </div>
    </div>
  );
}
