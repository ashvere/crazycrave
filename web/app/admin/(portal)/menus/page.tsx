import Link from "next/link";
import { menuImageSrc } from "@/lib/shop-logos";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff-session";
import { resolveStaffShop } from "@/lib/admin-shop-scope";
import { ShopPicker } from "@/components/admin/shop-picker";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { deleteMenuItem, toggleMenuItem } from "@/app/admin/actions";

type SearchParams = Promise<{ shop_id?: string; notice?: string }>;

const NOTICES: Record<string, { kind: string; text: string }> = {
  deleted: { kind: "success", text: "Menu item deleted." },
  kept: { kind: "warning", text: "That item is on past orders, so it was switched off instead of deleted." },
};

export default async function AdminMenusPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const { shopId, shop, shops } = await resolveStaffShop(staff, sp.shop_id, "/admin/menus");

  if (!shopId || !shop) {
    return (
      <>
        <header className="staff-page-head">
          <h1 className="staff-page-head__title">Menus</h1>
          <p className="staff-page-head__sub">Choose a shop to manage its menu</p>
        </header>
        <ShopPicker basePath="/admin/menus" shops={shops} current={null} />
      </>
    );
  }

  const supabase = await createClient();

  const { data: menuList } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", shopId)
    .order("name");

  const items = menuList ?? [];

  return (
    <>
      <header className="staff-page-head staff-page-head--full d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h1 className="staff-page-head__title">{shop.name} — Menus</h1>
          <p className="staff-page-head__sub">Manage items for this kitchen</p>
        </div>
        <Link
          href={`/admin/menus/new?shop_id=${shopId}`}
          className="staff-btn staff-btn--primary flex-shrink-0"
        >
          <i className="bi bi-plus-lg" /> Add menu
        </Link>
      </header>

      {staff.role === "admin" ? (
        <ShopPicker basePath="/admin/menus" shops={shops} current={shopId} />
      ) : null}

      {NOTICES[sp.notice ?? ""] ? (
        <div className={`alert alert-${NOTICES[sp.notice ?? ""].kind}`}>{NOTICES[sp.notice ?? ""].text}</div>
      ) : null}

      {items.length === 0 ? (
        <p className="staff-empty">
          No menus yet.{" "}
          <Link href={`/admin/menus/new?shop_id=${shopId}`}>Add your first item</Link>.
        </p>
      ) : (
        <div className="staff-card-grid staff-card-grid--menus">
          {items.map((menu) => {
            const m = menu as {
              id: number;
              name: string;
              description: string | null;
              price: number;
              image: string | null;
              is_active: boolean;
            };
            const image = menuImageSrc(m.image);
            return (
              <article
                key={m.id}
                className={`staff-menu-card ${!m.is_active ? "staff-menu-card--inactive" : ""}`}
              >
                <div className="staff-menu-card__img-wrap">
                  <img src={image} className="staff-menu-card__img" alt="" loading="lazy" />
                </div>
                <div className="staff-menu-card__body">
                  <h2 className="staff-menu-card__title">{m.name}</h2>
                  <p className="staff-menu-card__desc">
                    {m.description?.trim() || "No description"}
                  </p>
                  <p className="staff-menu-card__price">₱{Number(m.price).toFixed(2)}</p>
                  <div className="staff-menu-card__actions">
                    <Link
                      href={`/admin/menus/item/${m.id}?shop_id=${shopId}`}
                      className="staff-chip staff-chip--edit"
                    >
                      Edit
                    </Link>
                    <form action={toggleMenuItem}>
                      <input type="hidden" name="menu_id" value={m.id} />
                      <input type="hidden" name="shop_id" value={shopId} />
                      <button type="submit" className={`staff-chip ${m.is_active ? "staff-chip--menus" : "staff-chip--edit"} border-0`}>
                        {m.is_active ? "Turn off" : "Turn on"}
                      </button>
                    </form>
                    <form action={deleteMenuItem}>
                      <input type="hidden" name="menu_id" value={m.id} />
                      <input type="hidden" name="shop_id" value={shopId} />
                      <ConfirmSubmit message={`Delete ${m.name}?`} className="staff-chip border-0 text-danger">
                        Delete
                      </ConfirmSubmit>
                    </form>
                    {!m.is_active ? <span className="badge bg-secondary">Off</span> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
