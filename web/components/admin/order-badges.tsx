/** Consistent status / payment pills for the staff order screens (styles in admin-portal.css). */

type Tone = "amber" | "blue" | "indigo" | "green" | "red" | "slate";
type Def = { label: string; icon: string; tone: Tone };

const ORDER_STATUS: Record<string, Def> = {
  pending: { label: "Pending", icon: "bi-hourglass-split", tone: "amber" },
  preparing: { label: "Preparing", icon: "bi-fire", tone: "blue" },
  delivering: { label: "Delivering", icon: "bi-bicycle", tone: "indigo" },
  completed: { label: "Completed", icon: "bi-check-circle-fill", tone: "green" },
  cancelled: { label: "Cancelled", icon: "bi-x-circle-fill", tone: "red" },
};

const PAYMENT_STATUS: Record<string, Def> = {
  paid: { label: "Paid", icon: "bi-check-circle-fill", tone: "green" },
  pending: { label: "Unpaid", icon: "bi-clock", tone: "amber" },
  failed: { label: "Failed", icon: "bi-exclamation-circle-fill", tone: "red" },
  refunded: { label: "Refunded", icon: "bi-arrow-counterclockwise", tone: "slate" },
};

const DELIVERY_STATUS: Record<string, Def> = {
  assigned: { label: "Assigned", icon: "bi-person-check", tone: "slate" },
  picked_up: { label: "Picked up", icon: "bi-bag-check", tone: "blue" },
  on_the_way: { label: "On the way", icon: "bi-bicycle", tone: "indigo" },
  delivered: { label: "Delivered", icon: "bi-house-check-fill", tone: "green" },
};

const PAYMENT_METHOD: Record<string, { label: string; icon: string }> = {
  cod: { label: "Cash on delivery", icon: "bi-cash-coin" },
  gcash: { label: "GCash", icon: "bi-phone" },
  bank: { label: "Bank transfer", icon: "bi-bank" },
  card: { label: "Card", icon: "bi-credit-card" },
};

/** "on_the_way" → "On the way" for values we don't have a label for. */
function humanize(value: string): string {
  const s = value.replace(/_/g, " ").trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) : "—";
}

function Pill({ def }: { def: Def }) {
  return (
    <span className={`staff-pill staff-pill--${def.tone}`}>
      <i className={`bi ${def.icon}`} aria-hidden="true" />
      {def.label}
    </span>
  );
}

function lookup(map: Record<string, Def>, raw: string | null | undefined): Def {
  const key = String(raw ?? "").toLowerCase();
  return map[key] ?? { label: humanize(key), icon: "bi-circle", tone: "slate" };
}

export function OrderStatusPill({ status }: { status: string | null | undefined }) {
  return <Pill def={lookup(ORDER_STATUS, status)} />;
}

export function PaymentStatusPill({ status }: { status: string | null | undefined }) {
  return <Pill def={lookup(PAYMENT_STATUS, status)} />;
}

export function DeliveryStatusPill({ status }: { status: string | null | undefined }) {
  return <Pill def={lookup(DELIVERY_STATUS, status)} />;
}

export function PaymentMethod({ method }: { method: string | null | undefined }) {
  const key = String(method ?? "").toLowerCase();
  const m = PAYMENT_METHOD[key] ?? { label: humanize(key), icon: "bi-wallet2" };
  return (
    <span className="staff-pay-method">
      <i className={`bi ${m.icon}`} aria-hidden="true" />
      {m.label}
    </span>
  );
}

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([value, d]) => ({
  value,
  label: d.label,
}));
