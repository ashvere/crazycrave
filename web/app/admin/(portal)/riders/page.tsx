import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";
import { createRider, setRiderApproval } from "./actions";
import { Stars } from "@/components/stars";
import { riderRatings } from "@/lib/ratings";

type Tab = "pending" | "approved" | "rejected";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const DOC_LABEL: Record<string, string> = {
  license: "Driver's license",
  registration: "Vehicle registration",
  id_photo: "Valid ID",
  other: "Document",
};

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

type Search = Promise<{ tab?: string; done?: string; error?: string }>;

export default async function AdminRidersPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "pending";
  const notice = NOTICES[sp.error ?? sp.done ?? ""];

  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to manage riders.</div>
      </div>
    );
  }

  const [{ data: all }, { data: shops }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, approval_status, restaurant_id, created_at")
      .eq("role", "rider")
      .order("created_at", { ascending: false }),
    admin.from("restaurants").select("id, name").order("name"),
  ]);

  const riders = all ?? [];
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, riders.filter((r) => r.approval_status === t.key).length])
  ) as Record<Tab, number>;
  const list = riders.filter((r) => r.approval_status === tab);
  const ids = list.map((r) => String(r.id));
  const shopName = new Map((shops ?? []).map((s) => [Number(s.id), String(s.name)]));

  const [{ data: details }, { data: docs }, emails, ratings] = await Promise.all([
    ids.length
      ? admin.from("rider_profiles").select("user_id, phone, vehicle_type, vehicle_plate").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; phone: string | null; vehicle_type: string; vehicle_plate: string | null }[] }),
    ids.length
      ? admin.from("rider_documents").select("user_id, doc_type, storage_path").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; doc_type: string; storage_path: string }[] }),
    Promise.all(
      ids.map(async (id) => [id, (await admin.auth.admin.getUserById(id)).data.user?.email ?? ""] as const)
    ),
    riderRatings(admin, tab === "approved" ? ids : []),
  ]);

  // Private bucket: short-lived links so documents can be viewed without making them public.
  const paths = (docs ?? []).map((d) => String(d.storage_path));
  const { data: signed } = paths.length
    ? await admin.storage.from("rider-documents").createSignedUrls(paths, 60 * 15)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  const detailBy = new Map((details ?? []).map((d) => [String(d.user_id), d]));
  const emailBy = new Map(emails);

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <p className="text-uppercase small text-muted fw-semibold mb-1">Fleet</p>
          <h1 className="h3 fw-bold mb-0">Riders</h1>
        </div>
        <p className="small text-muted mb-0">
          New riders apply at <code>/rider/apply</code>. Approve them here before they can sign in.
        </p>
      </div>

      {notice ? <div className={`alert alert-${notice.kind}`}>{notice.text}</div> : null}

      <details className="staff-panel mb-3">
        <summary className="staff-panel__head" style={{ cursor: "pointer" }}>
          <i className="bi bi-person-plus" aria-hidden="true" />
          <span>Add rider directly</span>
        </summary>
        <form action={createRider} className="staff-panel__body row g-2">
          <div className="col-12 col-md-4">
            <label className="form-label small mb-1" htmlFor="nr-name">Name</label>
            <input id="nr-name" name="name" className="form-control form-control-sm" required />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small mb-1" htmlFor="nr-email">Email</label>
            <input id="nr-email" name="email" type="email" className="form-control form-control-sm" required autoComplete="off" />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small mb-1" htmlFor="nr-pw">Password</label>
            <input id="nr-pw" name="password" type="password" minLength={8} className="form-control form-control-sm" required autoComplete="new-password" />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="nr-phone">Phone</label>
            <input id="nr-phone" name="phone" inputMode="numeric" className="form-control form-control-sm" />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="nr-vehicle">Vehicle</label>
            <select id="nr-vehicle" name="vehicle_type" className="form-select form-select-sm">
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
              <option value="car">Car</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="nr-plate">Plate</label>
            <input id="nr-plate" name="vehicle_plate" className="form-control form-control-sm" />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="nr-shop">Delivers for</label>
            <select id="nr-shop" name="restaurant_id" className="form-select form-select-sm" defaultValue="">
              <option value="">All shops</option>
              {(shops ?? []).map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {String(s.name)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
              Create rider
            </button>
          </div>
        </form>
      </details>

      <ul className="nav nav-pills gap-2 mb-3">
        {TABS.map((t) => (
          <li key={t.key} className="nav-item">
            <Link
              href={`/admin/riders?tab=${t.key}`}
              className={`nav-link rounded-pill${tab === t.key ? " active" : " bg-white border"}`}
            >
              {t.label}{" "}
              <span className={`badge rounded-pill ${tab === t.key ? "text-bg-light" : "text-bg-secondary"}`}>
                {counts[t.key]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {list.length === 0 ? (
        <div className="staff-panel">
          <div className="staff-panel__body text-muted py-4 text-center">
            {tab === "pending" ? "No applications waiting for review." : `No ${tab} riders.`}
          </div>
        </div>
      ) : (
        <div className="d-grid gap-3">
          {list.map((r) => {
            const id = String(r.id);
            const d = detailBy.get(id);
            const riderDocs = (docs ?? []).filter((x) => String(x.user_id) === id);
            return (
              <section key={id} className="staff-panel">
                <div className="staff-panel__body">
                  <div className="d-flex flex-wrap justify-content-between gap-3">
                    <div className="min-w-0">
                      <h2 className="h5 fw-bold mb-1">{r.display_name || "Rider"}</h2>
                      <p className="small text-muted mb-2">
                        {emailBy.get(id) || "—"} · Applied{" "}
                        {new Date(String(r.created_at)).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <dl className="row small mb-0">
                        <dt className="col-5 col-sm-4 text-muted fw-normal">Phone</dt>
                        <dd className="col-7 col-sm-8 mb-1">
                          {d?.phone ? <span className="tabular-nums">{d.phone}</span> : "—"}
                        </dd>
                        <dt className="col-5 col-sm-4 text-muted fw-normal">Vehicle</dt>
                        <dd className="col-7 col-sm-8 mb-1 text-capitalize">
                          {d?.vehicle_type ?? "—"}
                          {d?.vehicle_plate ? ` · ${d.vehicle_plate}` : ""}
                        </dd>
                        {tab === "approved" ? (
                          <>
                            <dt className="col-5 col-sm-4 text-muted fw-normal">Delivers for</dt>
                            <dd className="col-7 col-sm-8 mb-1">
                              {r.restaurant_id ? shopName.get(Number(r.restaurant_id)) ?? "Shop" : "All shops"}
                            </dd>
                            {ratings.available ? (
                              <>
                                <dt className="col-5 col-sm-4 text-muted fw-normal">Rating</dt>
                                <dd className="col-7 col-sm-8 mb-1">
                                  {ratings.byRider.get(id) ? (
                                    <span className="d-inline-flex align-items-center gap-2">
                                      <Stars value={ratings.byRider.get(id)!.avg} size="sm" />
                                      <span className="tabular-nums fw-semibold">
                                        {ratings.byRider.get(id)!.avg.toFixed(1)}
                                      </span>
                                      <span className="text-muted">({ratings.byRider.get(id)!.count})</span>
                                    </span>
                                  ) : (
                                    <span className="text-muted">No ratings yet</span>
                                  )}
                                </dd>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </dl>
                    </div>

                    <div className="d-flex flex-wrap gap-2 align-items-start">
                      {riderDocs.length === 0 ? (
                        <span className="small text-muted">No documents uploaded</span>
                      ) : (
                        riderDocs.map((doc) => {
                          const url = urlByPath.get(String(doc.storage_path));
                          const label = DOC_LABEL[String(doc.doc_type)] ?? "Document";
                          const isImg = /\.(png|jpe?g|webp|gif)$/i.test(String(doc.storage_path));
                          return url ? (
                            <a
                              key={String(doc.storage_path)}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none text-center small"
                              style={{ width: 120 }}
                            >
                              {isImg ? (
                                <img
                                  src={url}
                                  alt={label}
                                  width={120}
                                  height={80}
                                  className="rounded border d-block mb-1"
                                  style={{ objectFit: "cover" }}
                                />
                              ) : (
                                <span className="d-flex align-items-center justify-content-center rounded border mb-1" style={{ height: 80 }}>
                                  <i className="bi bi-file-earmark-pdf fs-3" aria-hidden="true" />
                                </span>
                              )}
                              {label}
                            </a>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
                    {tab !== "approved" ? (
                      <form action={setRiderApproval} className="d-flex flex-wrap gap-2 align-items-center">
                        <input type="hidden" name="rider_id" value={id} />
                        <input type="hidden" name="status" value="approved" />
                        <input type="hidden" name="tab" value={tab} />
                        <select
                          name="restaurant_id"
                          className="form-select form-select-sm"
                          style={{ width: "auto" }}
                          aria-label="Shop this rider delivers for"
                          defaultValue=""
                        >
                          <option value="">All shops</option>
                          {(shops ?? []).map((s) => (
                            <option key={String(s.id)} value={String(s.id)}>
                              Only {String(s.name)}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-sm btn-success rounded-pill px-3">
                          <i className="bi bi-check2 me-1" aria-hidden="true" />
                          Approve
                        </button>
                      </form>
                    ) : null}
                    {tab !== "rejected" ? (
                      <form action={setRiderApproval}>
                        <input type="hidden" name="rider_id" value={id} />
                        <input type="hidden" name="status" value="rejected" />
                        <input type="hidden" name="tab" value={tab} />
                        <button type="submit" className="btn btn-sm btn-outline-danger rounded-pill px-3">
                          {tab === "approved" ? "Remove access" : "Reject"}
                        </button>
                      </form>
                    ) : (
                      <form action={setRiderApproval}>
                        <input type="hidden" name="rider_id" value={id} />
                        <input type="hidden" name="status" value="pending" />
                        <input type="hidden" name="tab" value={tab} />
                        <button type="submit" className="btn btn-sm btn-outline-secondary rounded-pill px-3">
                          Move back to pending
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
