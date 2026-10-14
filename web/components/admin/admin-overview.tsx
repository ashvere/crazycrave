import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { VISITS_BUCKET, manilaDay, manilaMidnight } from "@/lib/site-visits";
import { LiveVisitors } from "@/components/admin/live-visitors";
import { SalesChart, type SalesDay } from "@/components/admin/sales-chart";
import { AutoRefresh } from "@/components/admin/auto-refresh";

const DAYS = 7;
const IN_PROGRESS = ["pending", "preparing", "delivering"];

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Row = {
  total: number;
  order_status: string;
  payment_status: string;
  customer_id: string | null;
  created_at: string;
};

/** Visitors logged today by /api/visit (one empty object per browser). */
async function visitorsToday(admin: NonNullable<ReturnType<typeof createAdminClient>>): Promise<number | null> {
  let count = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage
      .from(VISITS_BUCKET)
      .list(manilaDay(), { limit: 1000, offset });
    if (error) return offset === 0 ? null : count;
    count += data.length;
    if (data.length < 1000) return count;
  }
}

/** Platform admin Overview: live view, today's numbers, and the last 7 days. */
export async function AdminOverview() {
  const admin = createAdminClient();
  if (!admin) return null;

  const today = manilaDay();
  const start = new Date(manilaMidnight(today).getTime() - (DAYS - 1) * 86400000);

  const [{ data }, { count: inProgress }, visitors] = await Promise.all([
    admin
      .from("orders")
      .select("total, order_status, payment_status, customer_id, created_at")
      .gte("created_at", start.toISOString()),
    admin.from("orders").select("id", { count: "exact", head: true }).in("order_status", IN_PROGRESS),
    visitorsToday(admin),
  ]);
  const rows = (data as Row[] | null) ?? [];

  const days: SalesDay[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000 + 12 * 3600000);
    return {
      day: manilaDay(d),
      label: d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric" }),
      sales: 0,
      revenue: 0,
      orders: 0,
    };
  });
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const r of rows) {
    const d = byDay.get(manilaDay(new Date(r.created_at)));
    if (!d || r.order_status === "cancelled") continue;
    d.sales += Number(r.total);
    d.orders += 1;
    if (r.order_status === "completed" || r.payment_status === "paid") d.revenue += Number(r.total);
  }

  const t = byDay.get(today)!;
  const week = days.reduce(
    (a, d) => ({ sales: a.sales + d.sales, revenue: a.revenue + d.revenue, orders: a.orders + d.orders }),
    { sales: 0, revenue: 0, orders: 0 }
  );
  const aovToday = t.orders ? t.sales / t.orders : null;
  const aovWeek = week.orders ? week.sales / week.orders : null;
  const onlineToday = rows.filter(
    (r) => r.customer_id && r.order_status !== "cancelled" && manilaDay(new Date(r.created_at)) === today
  ).length;
  const conversion = visitors ? Math.min(100, (onlineToday / visitors) * 100) : null;

  const tiles = [
    {
      label: "Orders in progress",
      value: String(inProgress ?? 0),
      hint: "Pending, cooking, or out for delivery",
      href: "/admin/orders",
      icon: "bi-fire",
    },
    {
      label: "Average order value",
      value: aovToday !== null ? peso(aovToday) : aovWeek !== null ? peso(aovWeek) : "—",
      hint: aovToday !== null ? `Today · 7-day ${aovWeek !== null ? peso(aovWeek) : "—"}` : "Last 7 days (no orders today yet)",
      icon: "bi-receipt",
    },
    {
      label: "Conversion (est.)",
      value: conversion !== null ? `${conversion.toFixed(1)}%` : "—",
      hint:
        visitors === null
          ? "Visitor tracking starts with the next storefront visit"
          : `${onlineToday} online orders ÷ ${visitors} visitors today`,
      icon: "bi-funnel",
    },
    {
      label: "Visitors today",
      value: visitors === null ? "—" : String(visitors),
      hint: "Unique browsers on the storefront",
      icon: "bi-people",
    },
  ];

  return (
    <section aria-label="Overview" className="mb-4">
      <AutoRefresh seconds={30} />
      <div className="d-flex align-items-baseline justify-content-between mb-2">
        <h2 className="staff-stats-section__title mb-0">Overview</h2>
        <span className="small text-muted">Live · updates every 30s</span>
      </div>

      <div className="staff-stats-hero">
        <article className="staff-stats-hero__card">
          <LiveVisitors />
        </article>
        <article className="staff-stats-hero__card">
          <div className="staff-stats-hero__meta">
            <span className="staff-stats-hero__icon" aria-hidden="true">
              <i className="bi bi-calendar-day" />
            </span>
            <p className="staff-stats-hero__label">Sales today</p>
          </div>
          <p className="staff-stats-hero__value tabular-nums">{peso(t.sales)}</p>
          <p className="staff-stats-hero__hint">
            {t.orders} {t.orders === 1 ? "order" : "orders"} · {peso(t.revenue)} collected
          </p>
        </article>
      </div>

      <div className="staff-metrics-grid my-3">
        {tiles.map((m) => {
          const body = (
            <>
              <span className="staff-metric__icon" aria-hidden="true">
                <i className={`bi ${m.icon}`} />
              </span>
              <p className="staff-metric__label">{m.label}</p>
              <p className="staff-metric__value tabular-nums">{m.value}</p>
              <p className="small text-muted mb-0">{m.hint}</p>
            </>
          );
          return m.href ? (
            <Link key={m.label} href={m.href} className="staff-metric text-decoration-none text-reset">
              {body}
            </Link>
          ) : (
            <article key={m.label} className="staff-metric">
              {body}
            </article>
          );
        })}
      </div>

      <section className="staff-panel">
        <div className="staff-panel__head">
          <i className="bi bi-graph-up" aria-hidden="true" />
          <span>Sales &amp; revenue · last 7 days</span>
        </div>
        <div className="staff-panel__body">
          <div className="d-flex flex-wrap gap-4 mb-3">
            <div>
              <p className="small text-muted mb-0">Sales</p>
              <p className="h5 fw-bold tabular-nums mb-0">{peso(week.sales)}</p>
            </div>
            <div>
              <p className="small text-muted mb-0">Revenue collected</p>
              <p className="h5 fw-bold tabular-nums mb-0">{peso(week.revenue)}</p>
            </div>
            <div>
              <p className="small text-muted mb-0">Orders</p>
              <p className="h5 fw-bold tabular-nums mb-0">{week.orders}</p>
            </div>
          </div>
          <SalesChart days={days} />
          <p className="small text-muted mt-2 mb-0">
            Sales = all non-cancelled orders. Revenue = orders that are paid or completed.
          </p>
        </div>
      </section>
    </section>
  );
}
