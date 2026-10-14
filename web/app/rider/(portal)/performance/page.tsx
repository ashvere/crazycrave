import { RiderPageShell } from "@/components/rider/rider-page-shell";
import {
  deliveredAt,
  fee,
  fetchMyDeliveries,
  getRiderContext,
  isActive,
  isCancelled,
  isDelivered,
  peso,
  phDay,
} from "@/lib/rider-portal";

const dayLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short" });

export default async function RiderPerformancePage() {
  const { supabase, user, riderName } = await getRiderContext();
  const all = await fetchMyDeliveries(supabase, user.id);

  const delivered = all.filter(isDelivered);
  const cancelled = all.filter(isCancelled).length;
  const active = all.filter(isActive).length;
  const finished = delivered.length + cancelled;
  const completion = finished > 0 ? Math.round((delivered.length / finished) * 100) : null;
  const earnings = delivered.reduce((s, o) => s + fee(o), 0);
  const avgFee = delivered.length > 0 ? earnings / delivered.length : 0;

  // Minutes from order placed to delivery proof, where we have both.
  const minutes = delivered
    .filter((o) => o.delivery_proof_at)
    .map((o) => (deliveredAt(o).getTime() - new Date(o.created_at).getTime()) / 60_000)
    .filter((m) => m > 0 && m < 24 * 60);
  const avgMinutes = minutes.length > 0 ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null;

  // Last 7 days, oldest → today.
  const now = Date.now();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    return { key: phDay(d), label: i === 6 ? "Today" : dayLabel.format(d), count: 0 };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const o of delivered) {
    const slot = byKey.get(phDay(deliveredAt(o)));
    if (slot) slot.count += 1;
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const weekCount = days.reduce((s, d) => s + d.count, 0);

  return (
    <RiderPageShell
      riderName={riderName}
      kicker="Performance"
      title="Your stats"
      lede="How your deliveries are going."
    >
      <section className="rider-earn-grid" aria-label="Stats">
        <div className="rider-earn-card rider-earn-card--hero">
          <span className="rider-earn-card__label">Delivered</span>
          <span className="rider-earn-card__value tabular-nums">{delivered.length}</span>
          <span className="rider-earn-card__sub">{active} active now</span>
        </div>
        <div className="rider-earn-card">
          <span className="rider-earn-card__label">Completion rate</span>
          <span className="rider-earn-card__value tabular-nums">
            {completion === null ? "—" : `${completion}%`}
          </span>
          <span className="rider-earn-card__sub">{cancelled} cancelled</span>
        </div>
        <div className="rider-earn-card">
          <span className="rider-earn-card__label">Avg. fee</span>
          <span className="rider-earn-card__value tabular-nums">{peso(avgFee)}</span>
        </div>
        <div className="rider-earn-card">
          <span className="rider-earn-card__label">Avg. time</span>
          <span className="rider-earn-card__value tabular-nums">
            {avgMinutes === null ? "—" : `${avgMinutes} min`}
          </span>
          <span className="rider-earn-card__sub">order to drop-off</span>
        </div>
      </section>

      <section className="rider-dash-section">
        <h2 className="rider-dash-section__title">
          <i className="bi bi-bar-chart" aria-hidden="true" />
          <span>Last 7 days</span>
          <span className="rider-dash-section__meta">{weekCount} delivered</span>
        </h2>
        <div className="rider-dash-surface rider-chart" role="img" aria-label={`Deliveries per day: ${days.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
          {days.map((d) => (
            <div key={d.key} className="rider-chart__col">
              <span className="rider-chart__count tabular-nums">{d.count > 0 ? d.count : ""}</span>
              <span className="rider-chart__track">
                <span
                  className={`rider-chart__bar${d.label === "Today" ? " rider-chart__bar--today" : ""}`}
                  style={{ height: `${d.count === 0 ? 0 : Math.max(8, (d.count / maxCount) * 100)}%` }}
                />
              </span>
              <span className="rider-chart__label">{d.label}</span>
            </div>
          ))}
        </div>
      </section>
    </RiderPageShell>
  );
}
