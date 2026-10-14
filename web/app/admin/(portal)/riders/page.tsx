import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";
import { createRider, setRiderApproval } from "./actions";
import { Stars } from "@/components/stars";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { riderRatings } from "@/lib/ratings";

type Tab = "pending" | "approved" | "rejected";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "pending", label: "Pending", icon: "bi-hourglass-split" },
  { key: "approved", label: "Approved", icon: "bi-check2-circle" },
  { key: "rejected", label: "Rejected", icon: "bi-x-circle" },
];

const DOC_LABEL: Record<string, string> = {
  license: "Driver's license",
  registration: "Registration",
  id_photo: "Valid ID",
  other: "Document",
};

const VEHICLE_ICON: Record<string, string> = { motorcycle: "bi-scooter", bicycle: "bi-bicycle", car: "bi-car-front" };

const NOTICES: Record<string, { kind: string; text: string }> = {
  approved: { kind: "success", text: "Rider approved — they can now sign in at /rider/login." },
  rejected: { kind: "secondary", text: "Application rejected." },
  pending: { kind: "secondary", text: "Moved back to pending." },
  invalid: { kind: "warning", text: "That request was not valid." },
  config: { kind: "warning", text: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
  failed: { kind: "danger", text: "Could not update the rider. Please try again." },
  created: { kind: "success", text: "Rider account created — they can sign in at /rider/login now." },
  rider_fields: { kind: "warning", text: "Enter a name, a valid email, and a password of at least 8 characters." },
  rider_email: { kind: "warning", text: "That email already has an account." },
};

type Search = Promise<{ tab?: string; done?: string; error?: string; add?: string }>;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

export default async function AdminRidersPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "pending";
  const notice = NOTICES[sp.error ?? sp.done ?? ""];
  const showAdd = sp.add === "1" || sp.error === "rider_fields" || sp.error === "rider_email";

  const admin = createAdminClient();
  if (!admin) return <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to manage riders.</div>;

  const [{ data: all }, { data: shops }, { data: active }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, approval_status, restaurant_id, created_at")
      .eq("role", "rider")
      .order("created_at", { ascending: false }),
    admin.from("restaurants").select("id, name").order("name"),
    admin
      .from("orders")
      .select("rider_id")
      .not("rider_id", "is", null)
      .in("order_status", ["pending", "preparing", "delivering"])
      .neq("delivery_status", "delivered"),
  ]);

  const riders = all ?? [];
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, riders.filter((r) => r.approval_status === t.key).length])
  ) as Record<Tab, number>;
  const list = riders.filter((r) => r.approval_status === tab);
  const ids = list.map((r) => String(r.id));
  const shopName = new Map((shops ?? []).map((s) => [Number(s.id), String(s.name)]));
  const activeBy = new Map<string, number>();
  for (const o of active ?? []) activeBy.set(String(o.rider_id), (activeBy.get(String(o.rider_id)) ?? 0) + 1);
  const onDelivery = Array.from(activeBy.keys()).length;

  const approvedIds = riders.filter((r) => r.approval_status === "approved").map((r) => String(r.id));
  const [{ data: details }, { data: docs }, emails, ratings] = await Promise.all([
    ids.length
      ? admin.from("rider_profiles").select("user_id, phone, vehicle_type, vehicle_plate").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; phone: string | null; vehicle_type: string; vehicle_plate: string | null }[] }),
    ids.length
      ? admin.from("rider_documents").select("user_id, doc_type, storage_path").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; doc_type: string; storage_path: string }[] }),
    Promise.all(ids.map(async (id) => [id, (await admin.auth.admin.getUserById(id)).data.user?.email ?? ""] as const)),
    riderRatings(admin, approvedIds),
  ]);

  // Private bucket: short-lived links so documents can be viewed without making them public.
  const paths = (docs ?? []).map((d) => String(d.storage_path));
  const { data: signed } = paths.length
    ? await admin.storage.from("rider-documents").createSignedUrls(paths, 60 * 15)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  const detailBy = new Map((details ?? []).map((d) => [String(d.user_id), d]));
  const emailBy = new Map(emails);

  const allScores = Array.from(ratings.byRider.values());
  const fleetAvg = allScores.length
    ? allScores.reduce((s, r) => s + r.avg * r.count, 0) / allScores.reduce((s, r) => s + r.count, 0)
    : null;

  return (
    <div className="riders-page">
      <header className="staff-page-head staff-page-head--row">
        <div>
          <h1 className="staff-page-head__title">Riders</h1>
          <p className="staff-page-head__sub">
            New riders apply at <code>/rider/apply</code> and can sign in once you approve them.
          </p>
        </div>
        <Link href={showAdd ? `/admin/riders?tab=${tab}` : `/admin/riders?tab=${tab}&add=1`} className="staff-btn staff-btn--primary">
          <i className={`bi ${showAdd ? "bi-x-lg" : "bi-person-plus"}`} aria-hidden="true" /> {showAdd ? "Close" : "Add rider"}
        </Link>
      </header>

      {notice ? <div className={`alert alert-${notice.kind}`}>{notice.text}</div> : null}

      {showAdd ? (
        <section className="riders-add">
          <h2 className="riders-add__title">Add a rider directly</h2>
          <p className="riders-add__sub">Creates an approved account — no application needed.</p>
          <form action={createRider} className="row g-3">
            <div className="col-12 col-md-4">
              <label className="staff-field__label" htmlFor="nr-name">Name</label>
              <input id="nr-name" name="name" className="staff-field__input" required />
            </div>
            <div className="col-12 col-md-4">
              <label className="staff-field__label" htmlFor="nr-email">Email</label>
              <input id="nr-email" name="email" type="email" className="staff-field__input" required autoComplete="off" />
            </div>
            <div className="col-12 col-md-4">
              <label className="staff-field__label" htmlFor="nr-pw">Password</label>
              <input id="nr-pw" name="password" type="password" minLength={8} className="staff-field__input" required autoComplete="new-password" />
            </div>
            <div className="col-6 col-md-3">
              <label className="staff-field__label" htmlFor="nr-phone">Phone</label>
              <input id="nr-phone" name="phone" inputMode="numeric" className="staff-field__input" />
            </div>
            <div className="col-6 col-md-3">
              <label className="staff-field__label" htmlFor="nr-vehicle">Vehicle</label>
              <select id="nr-vehicle" name="vehicle_type" className="staff-field__select">
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="staff-field__label" htmlFor="nr-plate">Plate</label>
              <input id="nr-plate" name="vehicle_plate" className="staff-field__input" />
            </div>
            <div className="col-6 col-md-3">
              <label className="staff-field__label" htmlFor="nr-shop">Delivers for</label>
              <select id="nr-shop" name="restaurant_id" className="staff-field__select" defaultValue="">
                <option value="">All shops</option>
                {(shops ?? []).map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <button type="submit" className="staff-btn staff-btn--primary">
                <i className="bi bi-check-lg" aria-hidden="true" /> Create rider
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="staff-metrics-grid riders-stats">
        <article className="staff-metric staff-metric--amber">
          <span className="staff-metric__icon" aria-hidden="true"><i className="bi bi-hourglass-split" /></span>
          <p className="staff-metric__label">Waiting for review</p>
          <p className="staff-metric__value tabular-nums">{counts.pending}</p>
        </article>
        <article className="staff-metric staff-metric--blue">
          <span className="staff-metric__icon" aria-hidden="true"><i className="bi bi-people" /></span>
          <p className="staff-metric__label">Approved riders</p>
          <p className="staff-metric__value tabular-nums">{counts.approved}</p>
        </article>
        <article className="staff-metric staff-metric--sky">
          <span className="staff-metric__icon" aria-hidden="true"><i className="bi bi-bicycle" /></span>
          <p className="staff-metric__label">On a delivery now</p>
          <p className="staff-metric__value tabular-nums">{onDelivery}</p>
        </article>
        <article className="staff-metric">
          <span className="staff-metric__icon" aria-hidden="true"><i className="bi bi-star" /></span>
          <p className="staff-metric__label">Fleet rating</p>
          <p className="staff-metric__value tabular-nums">{fleetAvg !== null ? fleetAvg.toFixed(1) : "—"}</p>
        </article>
      </div>

      <nav className="riders-tabs" aria-label="Rider status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/riders?tab=${t.key}`}
            className={`riders-tabs__item${tab === t.key ? " is-active" : ""}`}
            aria-current={tab === t.key ? "page" : undefined}
          >
            <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
            <span className="riders-tabs__count">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <div className="staff-empty-panel">
          <i className="bi bi-person-badge" aria-hidden="true" />
          <p>{tab === "pending" ? "No applications waiting for review." : `No ${tab} riders.`}</p>
        </div>
      ) : (
        <div className="riders-grid">
          {list.map((r) => {
            const id = String(r.id);
            const name = String(r.display_name ?? "").trim() || "Rider";
            const d = detailBy.get(id);
            const riderDocs = (docs ?? []).filter((x) => String(x.user_id) === id);
            const rating = ratings.byRider.get(id);
            const busy = activeBy.get(id) ?? 0;
            const vehicle = d?.vehicle_type ?? "motorcycle";
            return (
              <article key={id} className={`rcard rcard--${tab}`}>
                <header className="rcard__head">
                  <span className="rcard__avatar" aria-hidden="true">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="rcard__who">
                    <h2 className="rcard__name">{name}</h2>
                    <p className="rcard__email">{emailBy.get(id) || "—"}</p>
                  </div>
                  {tab === "approved" ? (
                    <span className={`rcard__status${busy ? " is-busy" : ""}`}>
                      {busy ? `On delivery (${busy})` : "Available"}
                    </span>
                  ) : (
                    <span className="rcard__status">Applied {day(String(r.created_at))}</span>
                  )}
                </header>

                <dl className="rcard__facts">
                  <div>
                    <dt>Phone</dt>
                    <dd className="tabular-nums">
                      {d?.phone ? <a href={`tel:${d.phone}`}>{d.phone}</a> : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Vehicle</dt>
                    <dd className="text-capitalize">
                      <i className={`bi ${VEHICLE_ICON[vehicle] ?? "bi-scooter"} me-1`} aria-hidden="true" />
                      {vehicle}
                      {d?.vehicle_plate ? ` · ${d.vehicle_plate}` : ""}
                    </dd>
                  </div>
                  {tab === "approved" ? (
                    <>
                      <div>
                        <dt>Delivers for</dt>
                        <dd>{r.restaurant_id ? shopName.get(Number(r.restaurant_id)) ?? "Shop" : "All shops"}</dd>
                      </div>
                      <div>
                        <dt>Rating</dt>
                        <dd>
                          {rating ? (
                            <span className="d-inline-flex align-items-center gap-1">
                              <Stars value={rating.avg} size="sm" label="" />
                              <strong className="tabular-nums">{rating.avg.toFixed(1)}</strong>
                              <span className="text-muted">({rating.count})</span>
                            </span>
                          ) : (
                            <span className="text-muted">No ratings yet</span>
                          )}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                <div className="rcard__docs">
                  {riderDocs.length === 0 ? (
                    <span className="rcard__nodocs">
                      <i className="bi bi-file-earmark-x" aria-hidden="true" /> No documents uploaded
                    </span>
                  ) : (
                    riderDocs.map((doc) => {
                      const url = urlByPath.get(String(doc.storage_path));
                      const label = DOC_LABEL[String(doc.doc_type)] ?? "Document";
                      const isImg = /\.(png|jpe?g|webp|gif)$/i.test(String(doc.storage_path));
                      return url ? (
                        <a key={String(doc.storage_path)} href={url} target="_blank" rel="noopener noreferrer" className="rider-doc">
                          {isImg ? (
                            <img src={url} alt="" className="rider-doc__img" />
                          ) : (
                            <span className="rider-doc__img rider-doc__img--file">
                              <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                            </span>
                          )}
                          <span className="rider-doc__label">{label}</span>
                        </a>
                      ) : null;
                    })
                  )}
                </div>

                <footer className="rcard__actions">
                  {tab !== "approved" ? (
                    <form action={setRiderApproval} className="rcard__approve">
                      <input type="hidden" name="rider_id" value={id} />
                      <input type="hidden" name="status" value="approved" />
                      <input type="hidden" name="tab" value={tab} />
                      <select name="restaurant_id" className="staff-field__select" aria-label={`Shop ${name} delivers for`} defaultValue="">
                        <option value="">All shops</option>
                        {(shops ?? []).map((s) => (
                          <option key={String(s.id)} value={String(s.id)}>
                            Only {String(s.name)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="staff-btn staff-btn--primary">
                        <i className="bi bi-check2" aria-hidden="true" /> Approve
                      </button>
                    </form>
                  ) : null}
                  <Link href={`/admin/messages?rider=${id}`} className="staff-btn staff-btn--secondary">
                    <i className="bi bi-chat-dots" aria-hidden="true" /> Message
                  </Link>
                  {tab !== "rejected" ? (
                    <form action={setRiderApproval}>
                      <input type="hidden" name="rider_id" value={id} />
                      <input type="hidden" name="status" value="rejected" />
                      <input type="hidden" name="tab" value={tab} />
                      <ConfirmSubmit
                        message={tab === "approved" ? `Remove ${name}'s access? They won't be able to sign in.` : `Reject ${name}'s application?`}
                        className="staff-btn rcard__danger"
                      >
                        {tab === "approved" ? "Remove access" : "Reject"}
                      </ConfirmSubmit>
                    </form>
                  ) : (
                    <form action={setRiderApproval}>
                      <input type="hidden" name="rider_id" value={id} />
                      <input type="hidden" name="status" value="pending" />
                      <input type="hidden" name="tab" value={tab} />
                      <button type="submit" className="staff-btn staff-btn--secondary">
                        Move back to pending
                      </button>
                    </form>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
