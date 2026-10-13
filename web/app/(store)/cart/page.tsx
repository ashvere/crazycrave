import Link from "next/link";
import { cookies } from "next/headers";
import {
  COOKIE_CART,
  COOKIE_CART_SHOP,
  COOKIE_CHECKOUT_PREFILL,
  cartItemCount,
  encodeMenuImagePath,
  parseCartJson,
} from "@/lib/cart-cookies";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ClearCartLink } from "@/components/store/clear-cart-link";
import { QtyStepper } from "@/components/store/cart-controls";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function CartPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  const count = cartItemCount(cart);
  const shopIdRaw = cookieStore.get(COOKIE_CART_SHOP)?.value;
  const shopId = shopIdRaw ? parseInt(shopIdRaw, 10) : NaN;

  let shopName = "";
  let loggedIn = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      loggedIn = !!user;
      if (Number.isFinite(shopId) && shopId > 0) {
        const { data: r } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", shopId)
          .maybeSingle();
        shopName = (r?.name as string | undefined) ?? "";
      }
    } catch {
      shopName = "";
    }
  }

  const prefillRaw = cookieStore.get(COOKIE_CHECKOUT_PREFILL)?.value;
  let prefillNote = "";
  if (prefillRaw) {
    try {
      const o = JSON.parse(prefillRaw) as Record<string, string>;
      if (o.fulfillment) prefillNote = `Checkout prefill: ${o.fulfillment}`;
    } catch {
      prefillNote = "";
    }
  }

  const lines = Object.values(cart);
  let grandTotal = 0;
  for (const line of lines) {
    grandTotal += Number(line.price) * line.qty;
  }

  const shopsHref = "/#shops";

  return (
    <main className="cart-page">
      <div className="container cart-page__inner">
        <header className="cart-page__intro">
          <p className="cart-page__kicker">Checkout</p>
          <h1 className="cart-page__title">Your cart</h1>
          <p className="cart-page__lede">Review items before you continue.</p>
        </header>

        {sp.error === "different_shop" ? (
          <div className="alert cart-page__flash alert-dismissible fade show" role="alert">
            <div className="d-flex align-items-start gap-3">
              <i
                className="bi bi-exclamation-triangle-fill cart-page__flash-icon flex-shrink-0 mt-1"
                aria-hidden="true"
              />
              <div className="flex-grow-1 min-w-0">
                <strong className="d-block mb-1">One shop per order</strong>
                <span className="cart-page__flash-text">
                  You can only add items from one kitchen per order. Clear your cart first, then order
                  from another shop.
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
        ) : null}

        {count === 0 ? (
          <div className="cart-page__surface">
            <div className="cart-page-empty" role="status">
              <i className="bi bi-cart3 cart-page-empty__icon" aria-hidden="true" />
              <p className="cart-page-empty__text">Your cart is empty.</p>
              <Link className="btn btn-sm btn-dark cart-page-empty__cta" href={shopsHref}>
                Browse shops
              </Link>
            </div>
          </div>
        ) : (
          <div className="cart-page__surface">
            {shopName ? (
              <p className="small text-muted mb-3">
                Ordering from <strong>{shopName}</strong>
              </p>
            ) : null}
            {prefillNote ? <p className="small text-muted mb-3">{prefillNote}</p> : null}
            <ul className="kk-cart-list">
              {lines.map((item) => {
                const imgPath = item.image
                  ? `/images/menus/${encodeMenuImagePath(item.image)}`
                  : "/images/menus/default.png";
                return (
                  <li key={item.menu_id} className="kk-cart-line">
                    <img src={imgPath} alt="" width={64} height={64} className="kk-cart-line__img" loading="lazy" />
                    <div className="kk-cart-line__info">
                      <span className="kk-cart-line__name">{item.name}</span>
                      <span className="kk-cart-line__unit tabular-nums">₱{Number(item.price).toFixed(2)} each</span>
                    </div>
                    <div className="kk-cart-line__side">
                      <span className="kk-cart-line__total tabular-nums">
                        ₱{(Number(item.price) * item.qty).toFixed(2)}
                      </span>
                      <QtyStepper menuId={item.menu_id} qty={item.qty} name={item.name} returnTo="/cart" size="sm" />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="cart-page__bar">
              <ClearCartLink />
              <div className="cart-page__bar-total">
                <span className="cart-page__bar-label">Grand total</span>
                <span className="cart-page__bar-amount tabular-nums">
                  ₱{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="cart-page__cta">
              {Number.isFinite(shopId) && shopId > 0 ? (
                <Link href={`/restaurant?id=${shopId}`} className="btn btn-outline-dark btn-lg rounded-pill px-4">
                  Add more
                </Link>
              ) : null}
              {loggedIn ? (
                <Link
                  href="/checkout"
                  className="btn btn-dark btn-lg rounded-pill px-4 fw-semibold"
                >
                  Checkout
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-dark btn-lg rounded-pill px-4 fw-semibold"
                  data-bs-toggle="modal"
                  data-bs-target="#kkAuthModal"
                  data-auth-tab="login"
                >
                  Log in to check out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
