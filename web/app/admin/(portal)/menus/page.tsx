import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { encodeMenuImagePath } from "@/lib/cart-cookies";
import { requireStaff } from "@/lib/staff-session";
import { resolveStaffShop } from "@/lib/admin-shop-scope";
import { ShopPicker } from "@/components/admin/shop-picker";

type SearchParams = Promise<{ shop_id?: string }>;

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
            const image = m.image
              ? `/images/menus/${encodeMenuImagePath(m.image)}`
              : "/images/menus/default.png";
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
                    {!m.is_active ? (
                      <span className="badge bg-secondary">Off</span>
                    ) : null}
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
