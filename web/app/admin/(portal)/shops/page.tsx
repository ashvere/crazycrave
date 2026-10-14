import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";
import { shopLogoSrc } from "@/lib/shop-logos";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { deleteShop, setShopActive } from "./actions";

const NOTICES: Record<string, { kind: string; text: string }> = {
  created: { kind: "success", text: "Shop added." },
  updated: { kind: "success", text: "Shop saved." },
  deleted: { kind: "success", text: "Shop deleted." },
  activated: { kind: "success", text: "Shop is visible to customers again." },
  deactivated: { kind: "secondary", text: "Shop hidden from customers." },
  has_orders: {
    kind: "warning",
    text: "This shop has orders, so it can't be deleted. Hide it instead to remove it from the storefront.",
  },
  invalid: { kind: "warning", text: "That request was not valid." },
  config: { kind: "warning", text: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
  failed: { kind: "danger", text: "Could not update the shop. Please try again." },
};

type Search = Promise<{ done?: string; error?: string }>;

export default async function AdminShopsPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  const sp = await searchParams;
  const notice = NOTICES[sp.error ?? sp.done ?? ""];

  const admin = createAdminClient();
  if (!admin) {
    return <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to manage shops.</div>;
  }

  const { data } = await admin
    .from("restaurants")
    .select("id, name, description, logo, delivery_time, is_active")
    .order("id", { ascending: false });
  const shops = data ?? [];

  return (
    <div className="staff-shops-page">
      <header className="staff-page-head staff-page-head--row">
        <div>
          <h1 className="staff-page-head__title">Chicken shops</h1>
          <p className="staff-page-head__sub">Manage locations, menus, and kitchen operations</p>
        </div>
        <Link href="/admin/shops/new" className="staff-btn staff-btn--primary">
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add shop
        </Link>
      </header>

      {notice ? <div className={`alert alert-${notice.kind}`}>{notice.text}</div> : null}

      {shops.length === 0 ? (
        <div className="staff-empty-panel">
          <i className="bi bi-shop" aria-hidden="true" />
          <p>No shops yet. Add your first location to get started.</p>
          <Link href="/admin/shops/new" className="staff-btn staff-btn--primary">
            Add shop
          </Link>
        </div>
      ) : (
        <div className="staff-shop-grid staff-shop-grid--manage">
          {shops.map((shop) => {
            const desc = String(shop.description ?? "").trim();
            const delivery = String(shop.delivery_time ?? "").trim();
            return (
              <article
                key={shop.id}
                className="staff-shop-card staff-shop-card--manage"
                style={shop.is_active ? undefined : { opacity: 0.7 }}
              >
                <div className="staff-shop-card__img-wrap staff-shop-card__img-wrap--contain">
                  <img src={shopLogoSrc(shop.logo)} className="staff-shop-card__img" alt="" loading="lazy" />
                </div>
                <div className="staff-shop-card__body">
                  <h2 className="staff-shop-card__title">
                    {shop.name}{" "}
                    {shop.is_active ? null : <span className="badge text-bg-secondary align-middle">Hidden</span>}
                  </h2>
                  {desc ? <p className="staff-shop-card__desc">{desc}</p> : null}
                  {delivery ? (
                    <p className="staff-shop-card__meta">
                      <i className="bi bi-clock" aria-hidden="true" /> {delivery} min delivery
                    </p>
                  ) : null}

                  <div className="staff-shop-card__actions">
                    <Link href={`/admin/kds?shop_id=${shop.id}`} className="staff-chip staff-chip--menus">
                      KDS
                    </Link>
                    <Link href={`/admin/pos?shop_id=${shop.id}`} className="staff-chip staff-chip--edit">
                      POS
                    </Link>
                    <Link href={`/admin/menus?shop_id=${shop.id}`} className="staff-chip staff-chip--menus">
                      Menu
                    </Link>
                  </div>

                  <footer className="staff-shop-card__footer">
                    <Link
                      href={`/admin/shops/${shop.id}`}
                      className="staff-shop-card__link staff-shop-card__link--edit"
                    >
                      <i className="bi bi-pencil" aria-hidden="true" /> Edit
                    </Link>
                    <form action={setShopActive}>
                      <input type="hidden" name="id" value={shop.id} />
                      <input type="hidden" name="active" value={shop.is_active ? "0" : "1"} />
                      <button type="submit" className="staff-shop-card__link btn btn-link p-0">
                        <i className={`bi ${shop.is_active ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />{" "}
                        {shop.is_active ? "Hide" : "Show"}
                      </button>
                    </form>
                    <form action={deleteShop}>
                      <input type="hidden" name="id" value={shop.id} />
                      <ConfirmSubmit
                        message={`Delete ${shop.name}? Its menu items are deleted too.`}
                        className="staff-shop-card__link staff-shop-card__link--danger btn btn-link p-0"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" /> Delete
                      </ConfirmSubmit>
                    </form>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
