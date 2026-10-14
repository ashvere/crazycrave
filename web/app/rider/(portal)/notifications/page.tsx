import Link from "next/link";
import { RiderPageShell } from "@/components/rider/rider-page-shell";
import {
  fetchMyDeliveries,
  getRiderContext,
  isActive,
  isCancelled,
  phDateTime,
} from "@/lib/rider-portal";

type Alert = {
  key: string;
  at: Date;
  icon: string;
  tone: "blue" | "amber" | "red";
  title: string;
  text: string;
  href: string;
  action: string;
};

export default async function RiderNotificationsPage() {
  const { supabase, user, riderName } = await getRiderContext();
  const orders = await fetchMyDeliveries(supabase, user.id);
  const alerts: Alert[] = [];

  // Unread customer messages, one alert per order.
  const ids = orders.map((o) => o.id);
  if (ids.length > 0) {
    const { data: msgs } = await supabase
      .from("order_messages")
      .select("order_id, body, created_at")
      .in("order_id", ids)
      .eq("sender_role", "user")
      .is("read_at_rider", null)
      .order("created_at", { ascending: false });
    const seen = new Map<number, { count: number; body: string; at: string }>();
    for (const m of (msgs ?? []) as { order_id: number; body: string; created_at: string }[]) {
      const cur = seen.get(m.order_id);
      if (cur) cur.count += 1;
      else seen.set(m.order_id, { count: 1, body: m.body, at: m.created_at });
    }
    for (const [orderId, m] of seen) {
      alerts.push({
        key: `msg-${orderId}`,
        at: new Date(m.at),
        icon: "bi-chat-dots-fill",
        tone: "blue",
        title: `${m.count} new message${m.count === 1 ? "" : "s"} · Order #${orderId}`,
        text: m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body,
        href: `/rider/order/${orderId}/chat`,
        action: "Reply",
      });
    }
  }

  // Deliveries waiting on you (not picked up yet).
  for (const o of orders.filter(isActive)) {
    if (o.delivery_status !== "assigned" && o.delivery_status !== "") continue;
    alerts.push({
      key: `new-${o.id}`,
      at: new Date(o.created_at),
      icon: "bi-bag-plus-fill",
      tone: "amber",
      title: `New delivery · Order #${o.id}`,
      text: `${o.customer_display_name} · ${o.barangay || "—"}`,
      href: `/rider/order/${o.id}`,
      action: "Open",
    });
  }

  // Recently cancelled orders that were assigned to you (last 3 days).
  const cutoff = Date.now() - 3 * 86_400_000;
  for (const o of orders.filter(isCancelled)) {
    if (new Date(o.created_at).getTime() < cutoff) continue;
    alerts.push({
      key: `cancel-${o.id}`,
      at: new Date(o.created_at),
      icon: "bi-x-circle-fill",
      tone: "red",
      title: `Order #${o.id} was cancelled`,
      text: "No need to deliver this one.",
      href: `/rider/order/${o.id}`,
      action: "View",
    });
  }

  alerts.sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <RiderPageShell
      riderName={riderName}
      kicker="Updates"
      title="Alerts"
      lede="New deliveries, customer messages, and cancellations."
    >
      {alerts.length === 0 ? (
        <div className="rider-dash-empty-card" role="status">
          <div className="rider-dash-empty-card__icon" aria-hidden="true">
            <i className="bi bi-bell" />
          </div>
          <h3 className="rider-dash-empty-card__title">You&apos;re all caught up</h3>
          <p className="rider-dash-empty-card__text">
            New deliveries and customer messages will appear here.
          </p>
        </div>
      ) : (
        <ul className="rider-list">
          {alerts.map((a) => (
            <li key={a.key}>
              <Link href={a.href} className="rider-list__row">
                <span className={`rider-list__icon rider-list__icon--${a.tone}`} aria-hidden="true">
                  <i className={`bi ${a.icon}`} />
                </span>
                <span className="rider-list__main">
                  <span className="rider-list__title">{a.title}</span>
                  <span className="rider-list__text">{a.text}</span>
                  <span className="rider-list__sub">{phDateTime.format(a.at)}</span>
                </span>
                <span className="rider-list__action">
                  {a.action} <i className="bi bi-chevron-right" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RiderPageShell>
  );
}
