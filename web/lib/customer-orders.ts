export type CustomerOrderRow = {
  id: number;
  customer_id: string | null;
  customer_display_name: string;
  shop_id: number;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  delivery_status: string;
  delivery_address: string;
  barangay: string;
  rider_id: string | null;
  cancel_reason: string | null;
  created_at: string;
  restaurants: { name: string } | null;
  rider_profile?: { display_name: string | null } | null;
};

export const CANCEL_REASONS: Record<string, string> = {
  changed_mind: "Changed my mind",
  wrong_order: "Ordered by mistake",
  too_long: "Taking too long",
  wrong_address: "Wrong address or items",
  found_elsewhere: "Found another option",
  other: "Other",
};

export function isPickupOrder(order: {
  barangay?: string | null;
  delivery_address?: string | null;
}): boolean {
  const barangay = String(order.barangay ?? "");
  const addr = String(order.delivery_address ?? "");
  return barangay.toLowerCase().includes("pickup") || addr.toLowerCase().includes("pickup");
}

export function customerCanCancel(order: {
  order_status?: string | null;
  delivery_status?: string | null;
}): boolean {
  const status = String(order.order_status ?? "pending").toLowerCase();
  const ds = String(order.delivery_status ?? "").toLowerCase();

  if (status === "completed" || status === "cancelled") return false;
  if (["picked_up", "on_the_way", "delivered"].includes(ds)) return false;
  if (status === "pending" || status === "preparing") return true;
  if (status === "delivering") return ds === "assigned" || ds === "";

  return false;
}

export type TrackStep = {
  key: string;
  label: string;
  desc: string;
  state: "done" | "current" | "upcoming" | "cancelled";
};

export function customerTrackingSteps(order: CustomerOrderRow): TrackStep[] {
  const orderStatus = String(order.order_status ?? "pending").toLowerCase();
  const deliveryStatus = String(order.delivery_status ?? "assigned").toLowerCase();
  const hasRider = Boolean(order.rider_id);
  const pickup = isPickupOrder(order);

  if (orderStatus === "cancelled") {
    return [
      {
        key: "cancelled",
        label: "Order cancelled",
        desc: order.cancel_reason?.trim() || "This order was cancelled.",
        state: "cancelled",
      },
    ];
  }

  const defs: Omit<TrackStep, "state">[] = [
    { key: "placed", label: "Order placed", desc: "We received your order" },
    { key: "preparing", label: "Preparing", desc: "The kitchen is preparing your food" },
  ];

  if (pickup) {
    defs.push({ key: "ready", label: "Ready for pickup", desc: "Head to the store when ready" });
  } else {
    defs.push(
      { key: "delivering", label: "Out for delivery", desc: "Your order is being prepared for delivery" },
      { key: "rider_assigned", label: "Rider assigned", desc: "A rider will pick up your order" },
      { key: "picked_up", label: "Picked up", desc: "Rider collected your order from the kitchen" },
      { key: "on_the_way", label: "On the way", desc: "Rider is heading to your address" },
      { key: "delivered", label: "Delivered", desc: "Order handed to you" }
    );
  }

  defs.push({
    key: "completed",
    label: "Completed",
    desc: pickup ? "Enjoy your meal!" : "Thank you for ordering",
  });

  let currentKey = "placed";
  if (orderStatus === "completed" || deliveryStatus === "delivered") {
    currentKey = "completed";
  } else if (deliveryStatus === "on_the_way") {
    currentKey = "on_the_way";
  } else if (deliveryStatus === "picked_up") {
    currentKey = "picked_up";
  } else if (orderStatus === "delivering" && hasRider && deliveryStatus === "assigned") {
    currentKey = "rider_assigned";
  } else if (orderStatus === "delivering") {
    currentKey = pickup ? "ready" : "delivering";
  } else if (orderStatus === "preparing") {
    currentKey = "preparing";
  }

  const keys = defs.map((d) => d.key);
  let currentIdx = keys.indexOf(currentKey);
  if (currentIdx < 0) currentIdx = 0;

  return defs.map((def, i) => {
    let state: TrackStep["state"] = "upcoming";
    if (orderStatus === "completed") {
      state = "done";
    } else if (i < currentIdx) {
      state = "done";
    } else if (i === currentIdx) {
      state = currentKey === "completed" ? "done" : "current";
    }
    return { ...def, state };
  });
}

/** Same format as PHP `date('M j, Y · g:i A', …)` on my-orders.php */
export function formatCustomerOrderDate(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return createdAt;
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

export function customerDeliveryStatusLabel(order: CustomerOrderRow): string {
  const orderStatus = String(order.order_status ?? "pending").toLowerCase();
  const deliveryStatus = String(order.delivery_status ?? "assigned").toLowerCase();

  if (orderStatus === "cancelled") return "Cancelled";
  if (orderStatus === "completed") return "Completed";
  if (orderStatus === "pending") return "Order received";
  if (orderStatus === "preparing") return "Preparing your order";
  if (isPickupOrder(order)) return "Ready for pickup soon";

  switch (deliveryStatus) {
    case "picked_up":
      return "Rider picked up your order";
    case "on_the_way":
      return "Rider is on the way";
    case "delivered":
      return "Delivered";
    default:
      return order.rider_id ? "Rider assigned" : "Waiting for rider";
  }
}

/** Order chat is for active deliveries; after completion/cancellation the history stays readable. */
export function isChatClosed(order: { order_status?: string | null; delivery_status?: string | null }): boolean {
  const s = String(order.order_status ?? "").toLowerCase();
  return s === "completed" || s === "cancelled" || order.delivery_status === "delivered";
}
