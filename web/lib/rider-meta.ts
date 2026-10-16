export function riderDeliveryStatusMeta(status: string): { className: string; label: string } {
  switch (status) {
    case "picked_up":
      return { className: "rider-pill--picked", label: "Picked up" };
    case "on_the_way":
      return { className: "rider-pill--way", label: "On the way" };
    case "delivered":
      return { className: "rider-pill--done", label: "Delivered" };
    default:
      return { className: "rider-pill--assigned", label: "Assigned" };
  }
}

export function riderOrderStatusMeta(status: string): { className: string; label: string } {
  switch (status.toLowerCase()) {
    case "preparing":
      return { className: "rider-pill--prep", label: "Preparing" };
    case "delivering":
      return { className: "rider-pill--way", label: "Delivering" };
    case "completed":
      return { className: "rider-pill--done", label: "Completed" };
    case "cancelled":
      return { className: "rider-pill--muted", label: "Cancelled" };
    default:
      return { className: "rider-pill--pending", label: "Pending" };
  }
}

/**
 * Delivery type, read from the notes checkout appends to `delivery_address`
 * ("Delivery option: Priority …" / "Scheduled delivery: …"); anything else is standard.
 */
export function riderDeliveryOptionMeta(
  address: string | null | undefined,
  barangay: string | null | undefined
): { className: string; label: string; icon: string } {
  const raw = address ?? "";
  if (/pickup/i.test(barangay ?? "") || raw.includes("Fulfillment: Store pickup"))
    return { className: "rider-pill--muted", label: "Store pickup", icon: "bi-shop" };
  if (raw.includes("Delivery option: Priority"))
    return { className: "rider-pill--priority", label: "Priority", icon: "bi-lightning-charge-fill" };
  const sched = raw.match(/Scheduled delivery: (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/);
  if (sched)
    return { className: "rider-pill--scheduled", label: `Scheduled · ${sched[1]} ${sched[2]}`, icon: "bi-calendar-event" };
  return { className: "rider-pill--standard", label: "Standard", icon: "bi-bicycle" };
}
