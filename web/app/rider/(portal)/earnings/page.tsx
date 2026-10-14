import Link from "next/link";
import { RiderPageShell } from "@/components/rider/rider-page-shell";
import {
  deliveredAt,
  fee,
  fetchMyDeliveries,
  getRiderContext,
  isDelivered,
  peso,
  phDateTime,
  phDay,
} from "@/lib/rider-portal";

export default async function RiderEarningsPage() {
  const { supabase, user, riderName } = await getRiderContext();
  const delivered = (await fetchMyDeliveries(supabase, user.id)).filter(isDelivered);

  const now = new Date();
  const today = phDay(now);
  const weekStart = phDay(new Date(now.getTime() - 6 * 86_400_000));
  const monthPrefix = today.slice(0, 7);

  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;
  let allTotal = 0;
  let todayCount = 0;
  for (const o of delivered) {
    const day = phDay(deliveredAt(o));
    const f = fee(o);
    allTotal += f;
    if (day === today) {
      todayTotal += f;
      todayCount += 1;
    }
    if (day >= weekStart) weekTotal += f;
    if (day.startsWith(monthPrefix)) monthTotal += f;
  }

  return (
    <RiderPageShell
      riderName={riderName}
      kicker="Your pay"
      title="Earnings"
      lede="Delivery fees from orders you've delivered."
    >
      <section className="rider-earn-grid" aria-label="Earnings summary">
        <div className="rider-earn-card rider-earn-card--hero">
          <span className="rider-earn-card__label">Today</span>
          <span className="rider-earn-card__value tabular-nums">{peso(todayTotal)}</span>
          <span className="rider-earn-card__sub">
            {todayCount} deliver{todayCount === 1 ? "y" : "ies"}
          </span>
        </div>
        <div className="rider-earn-card">
          <span className="rider-earn-card__label">Last 7 days</span>
          <span className="rider-earn-card__value tabular-nums">{peso(weekTotal)}</span>
        </div>
        <div className="rider-earn-card">
          <span className="rider-earn-card__label">This month</span>
          <span className="rider-earn-card__value tabular-nums">{peso(monthTotal)}</span>
        </div>
        <div className="rider-earn-card">
          <span className="rider-earn-card__label">All time</span>
          <span className="rider-earn-card__value tabular-nums">{peso(allTotal)}</span>
          <span className="rider-earn-card__sub">
            {delivered.length} deliver{delivered.length === 1 ? "y" : "ies"}
          </span>
        </div>
      </section>

      <section className="rider-dash-section">
        <h2 className="rider-dash-section__title">
          <i className="bi bi-receipt" aria-hidden="true" />
          <span>Delivered orders</span>
        </h2>
        {delivered.length === 0 ? (
          <div className="rider-dash-empty-card" role="status">
            <div className="rider-dash-empty-card__icon" aria-hidden="true">
              <i className="bi bi-wallet2" />
            </div>
            <h3 className="rider-dash-empty-card__title">No earnings yet</h3>
            <p className="rider-dash-empty-card__text">
              Fees show up here once you mark a delivery as delivered.
            </p>
          </div>
        ) : (
          <ul className="rider-list">
            {delivered.slice(0, 100).map((o) => (
              <li key={o.id}>
                <Link href={`/rider/order/${o.id}`} className="rider-list__row">
                  <span className="rider-list__icon rider-list__icon--green" aria-hidden="true">
                    <i className="bi bi-check-lg" />
                  </span>
                  <span className="rider-list__main">
                    <span className="rider-list__title">
                      Order #{o.id} · {o.barangay || "—"}
                    </span>
                    <span className="rider-list__sub">{phDateTime.format(deliveredAt(o))}</span>
                  </span>
                  <span className="rider-list__amount tabular-nums">+{peso(fee(o))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </RiderPageShell>
  );
}
