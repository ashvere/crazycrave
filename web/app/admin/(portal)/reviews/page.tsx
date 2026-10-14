import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { Stars } from "@/components/stars";
import { ShopPicker } from "@/components/admin/shop-picker";

type Search = Promise<{ shop_id?: string }>;

type Rating = {
  order_id: number;
  shop_id: number;
  rider_id: string | null;
  food_rating: number;
  rider_rating: number | null;
  comment: string | null;
  created_at: string;
};

export default async function AdminReviewsPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const scope = staffShopId(staff);
  const requested = parseInt(String((await searchParams).shop_id ?? ""), 10);
  const shopFilter = scope ?? (Number.isFinite(requested) && requested > 0 ? requested : null);

  const admin = createAdminClient();
  if (!admin) {
    return <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to view reviews.</div>;
  }

  let query = admin
    .from("order_ratings")
    .select("order_id, shop_id, rider_id, food_rating, rider_rating, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (shopFilter !== null) query = query.eq("shop_id", shopFilter);

  const [{ data, error }, { data: shopRows }] = await Promise.all([
    query,
    admin.from("restaurants").select("id, name").order("name"),
  ]);
  const ratings = (data as Rating[] | null) ?? [];
  const shops = (shopRows ?? []).map((s) => ({ id: Number(s.id), name: String(s.name) }));
  const shopName = new Map(shops.map((s) => [s.id, s.name]));

  const orderIds = ratings.map((r) => r.order_id);
  const riderIds = Array.from(new Set(ratings.map((r) => r.rider_id).filter(Boolean) as string[]));
  const [{ data: orderRows }, { data: riderRows }] = await Promise.all([
    orderIds.length
      ? admin.from("orders").select("id, customer_display_name").in("id", orderIds)
      : Promise.resolve({ data: [] as { id: number; customer_display_name: string }[] }),
    riderIds.length
      ? admin.from("profiles").select("id, display_name").in("id", riderIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
  ]);
  const customerBy = new Map((orderRows ?? []).map((o) => [Number(o.id), String(o.customer_display_name)]));
  const riderBy = new Map((riderRows ?? []).map((r) => [String(r.id), String(r.display_name ?? "Rider")]));

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const foodAvg = avg(ratings.map((r) => r.food_rating));
  const riderScores = ratings.map((r) => r.rider_rating).filter((x): x is number => x != null);
  const riderAvg = avg(riderScores);

  return (
    <>
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">Reviews</h1>
        <p className="staff-page-head__sub">What customers said after delivery</p>
      </header>

      {scope === null ? (
        <nav className="d-flex flex-wrap gap-2 mb-3" aria-label="Filter by shop">
          <Link
            href="/admin/reviews"
            className={`btn btn-sm rounded-pill px-3 ${shopFilter === null ? "btn-dark" : "btn-outline-secondary bg-white"}`}
          >
            All shops
          </Link>
          <ShopPicker basePath="/admin/reviews" shops={shops} current={shopFilter} inline />
        </nav>
      ) : null}

      {error ? (
        <div className="alert alert-warning">
          Ratings aren&apos;t set up in the database yet (run migration <code>20240516000014_order_ratings.sql</code>).
        </div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-4">
              <div className="staff-panel h-100">
                <div className="staff-panel__body">
                  <p className="small text-muted mb-1">Food</p>
                  <p className="h4 fw-bold mb-1 tabular-nums">{ratings.length ? foodAvg.toFixed(1) : "—"}</p>
                  {ratings.length ? <Stars value={foodAvg} size="sm" /> : null}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="staff-panel h-100">
                <div className="staff-panel__body">
                  <p className="small text-muted mb-1">Riders</p>
                  <p className="h4 fw-bold mb-1 tabular-nums">{riderScores.length ? riderAvg.toFixed(1) : "—"}</p>
                  {riderScores.length ? <Stars value={riderAvg} size="sm" /> : null}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="staff-panel h-100">
                <div className="staff-panel__body">
                  <p className="small text-muted mb-1">Reviews</p>
                  <p className="h4 fw-bold mb-0 tabular-nums">{ratings.length}</p>
                </div>
              </div>
            </div>
          </div>

          {ratings.length === 0 ? (
            <div className="staff-panel">
              <div className="staff-panel__body text-muted text-center py-4">No reviews yet.</div>
            </div>
          ) : (
            <div className="d-grid gap-2">
              {ratings.map((r) => (
                <article key={r.order_id} className="staff-panel">
                  <div className="staff-panel__body">
                    <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                      <div>
                        <strong>{customerBy.get(r.order_id) ?? "Customer"}</strong>{" "}
                        <span className="small text-muted">
                          · {shopName.get(r.shop_id) ?? "Shop"} ·{" "}
                          <Link href={`/admin/orders/${r.order_id}`}>Order #{r.order_id}</Link>
                        </span>
                      </div>
                      <span className="small text-muted">
                        {new Date(r.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-3 small mb-1">
                      <span className="d-inline-flex align-items-center gap-1">
                        Food <Stars value={r.food_rating} size="sm" />
                      </span>
                      {r.rider_rating != null ? (
                        <span className="d-inline-flex align-items-center gap-1">
                          {r.rider_id ? riderBy.get(r.rider_id) ?? "Rider" : "Rider"}{" "}
                          <Stars value={r.rider_rating} size="sm" />
                        </span>
                      ) : null}
                    </div>
                    {r.comment?.trim() ? <p className="mb-0">{r.comment}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
