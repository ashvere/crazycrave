"use client";

import { adminUpdateOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUS_OPTIONS } from "@/components/admin/order-badges";

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: string;
}) {
  const safe = ORDER_STATUS_OPTIONS.some((o) => o.value === currentStatus) ? currentStatus : "pending";

  return (
    <form action={adminUpdateOrderStatus} className="staff-status-form">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="staff-status-form__label" htmlFor={`ord-st-${orderId}`}>
        <i className="bi bi-arrow-repeat" aria-hidden="true" /> Change status
      </label>
      <select
        id={`ord-st-${orderId}`}
        name="order_status"
        className="form-select form-select-sm staff-status-form__select"
        defaultValue={safe}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {ORDER_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
