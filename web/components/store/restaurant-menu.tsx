import Link from "next/link";
import type { MenuRow, ShopRow } from "@/lib/menu-catalog";
import { encodeMenuImagePath } from "@/lib/cart-cookies";
import { shopLogoSrc } from "@/lib/shop-logos";
import { CartBar, QtyStepper } from "@/components/store/cart-controls";

type Props = {
  shop: ShopRow;
  menus: MenuRow[];
  differentShopError: boolean;
  /** menu_id → quantity already in the cart (only for this shop). */
  cartQty: Record<string, number>;
  /** Cart currently holds items from a different shop. */
  otherShopInCart: boolean;
  addedId: number | null;
};

export function RestaurantMenuPage({
  shop,
  menus,
  differentShopError,
  cartQty,
  otherShopInCart,
  addedId,
}: Props) {
  const returnTo = `/restaurant?id=${shop.id}`;
  const logoSrc = shopLogoSrc(shop.logo);
  const about = (shop.description ?? "").trim();

  return (
    <>
      {differentShopError ? (
        <div className="container mt-3">
          <div
            className="alert cart-page__flash alert-dismissible fade show"
            role="alert"
          >
            <div className="d-flex align-items-start gap-3">
              <i
                className="bi bi-exclamation-triangle-fill cart-page__flash-icon flex-shrink-0 mt-1"
                aria-hidden="true"
              />
              <div className="flex-grow-1 min-w-0">
                <strong className="d-block mb-1">Cart notice</strong>
                <span className="cart-page__flash-text">
                  You already have items from another shop in your cart. Please clear your
                  cart before ordering from this kitchen.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm cart-page__flash-dismiss flex-shrink-0"
                data-bs-dismiss="alert"
                aria-label="Dismiss notice"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="restaurant-menu-page">
        <div className="container my-4">
          <header className="restaurant-page-head">
            <div className="restaurant-page-head__brand">
              <div className="restaurant-page-head__logo-wrap flex-shrink-0">
                <img
                  src={logoSrc}
                  className="restaurant-page-head__logo rounded-circle"
                  width={72}
                  height={72}
                  alt=""
                  loading="eager"
                />
              </div>
              <div className="restaurant-page-head__text min-w-0">
                <h1 className="restaurant-page-head__title h4 fw-bold mb-1 text-break">
                  {shop.name}
                </h1>
                <span className="badge-delivery">
                  <i className="bi bi-stopwatch me-1" aria-hidden="true" />
                  {shop.delivery_time ?? "Delivery"}
                </span>
              </div>
            </div>
            {about !== "" ? (
              <div className="restaurant-page-head__about">
                <h2
                  id="restaurant-about-heading"
                  className="restaurant-page-head__about-title"
                >
                  About this kitchen
                </h2>
                <p className="restaurant-page-head__about-text">{about}</p>
              </div>
            ) : null}
          </header>

          <h2
            id="menu"
            className="h4 mb-3 menu-section-title d-flex align-items-center gap-2 mt-4"
          >
            <i className="bi bi-egg-fried fs-4" aria-hidden="true" />
            <span>Menu</span>
          </h2>

          {otherShopInCart && !differentShopError ? (
            <p className="kk-menu-notice" role="note">
              <i className="bi bi-info-circle" aria-hidden="true" />
              <span>
                Your cart has items from another shop. One shop per order —{" "}
                <Link href="/cart">finish or clear that cart</Link> to order here.
              </span>
            </p>
          ) : null}

          {menus.length === 0 ? (
            <p className="text-muted">No menu available.</p>
          ) : (
            <ul className="kk-menu-list" aria-label={`${shop.name} menu`}>
              {menus.map((menu) => {
                const mid = menu.id;
                const imgSrc = menu.image
                  ? `/images/menus/${encodeMenuImagePath(menu.image)}`
                  : "/images/menus/default.png";
                const desc = (menu.description ?? "").trim();
                const inCart = cartQty[String(mid)] ?? 0;
                const justAdded = addedId === mid;
                return (
                  <li
                    key={mid}
                    id={`menu-${mid}`}
                    className={`kk-menu-item${justAdded ? " is-added" : ""}`}
                  >
                    <div className="kk-menu-item__media">
                      <img src={imgSrc} alt="" loading="lazy" width={160} height={160} />
                    </div>
                    <div className="kk-menu-item__body">
                      <h3 className="kk-menu-item__name">{menu.name}</h3>
                      {desc !== "" ? <p className="kk-menu-item__desc">{desc}</p> : null}
                      <div className="kk-menu-item__foot">
                        <strong className="kk-menu-item__price tabular-nums">
                          ₱{Number(menu.price).toFixed(2)}
                        </strong>
                        {inCart > 0 ? (
                          <QtyStepper
                            menuId={mid}
                            qty={inCart}
                            name={menu.name}
                            returnTo={returnTo}
                            size="sm"
                          />
                        ) : otherShopInCart ? (
                          <button
                            type="button"
                            className="kk-add-btn kk-add-btn--muted"
                            disabled
                            title="Your cart has items from another shop"
                          >
                            <i className="bi bi-plus-lg" aria-hidden="true" />
                            Add
                          </button>
                        ) : (
                          <form action="/api/cart/add" method="POST">
                            <input type="hidden" name="menu_id" value={mid} />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <button type="submit" className="kk-add-btn" aria-label={`Add ${menu.name}`}>
                              <i className="bi bi-plus-lg" aria-hidden="true" />
                              Add
                            </button>
                          </form>
                        )}
                      </div>
                      {justAdded ? (
                        <p className="kk-menu-item__added" role="status">
                          <i className="bi bi-check-circle-fill" aria-hidden="true" /> Added to cart
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 mb-0">
            <Link href="/" className="text-decoration-none">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <CartBar />
    </>
  );
}
