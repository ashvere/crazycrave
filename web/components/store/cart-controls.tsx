import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_CART, cartItemCount, cartTotal, parseCartJson } from "@/lib/cart-cookies";

/** − qty + for one cart line. Plain form posts, so it works before JavaScript loads. */
export function QtyStepper({
  menuId,
  qty,
  name,
  returnTo,
  size = "md",
}: {
  menuId: number;
  qty: number;
  name: string;
  returnTo: string;
  size?: "sm" | "md";
}) {
  return (
    <form action="/api/cart/qty" method="POST" className={`kk-qty kk-qty--${size}`}>
      <input type="hidden" name="menu_id" value={menuId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button
        type="submit"
        name="op"
        value="dec"
        className="kk-qty__btn"
        aria-label={qty === 1 ? `Remove ${name}` : `One less ${name}`}
      >
        <i className={`bi ${qty === 1 ? "bi-trash3" : "bi-dash-lg"}`} aria-hidden="true" />
      </button>
      <span className="kk-qty__value tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="submit"
        name="op"
        value="inc"
        className="kk-qty__btn"
        aria-label={`One more ${name}`}
      >
        <i className="bi bi-plus-lg" aria-hidden="true" />
      </button>
    </form>
  );
}

/** Sticky "View cart" bar shown while the cart has items (above the phone tab bar). */
export async function CartBar() {
  const cart = parseCartJson((await cookies()).get(COOKIE_CART)?.value);
  const count = cartItemCount(cart);
  if (count === 0) return null;
  const total = cartTotal(cart);

  return (
    <div className="kk-cart-bar" role="region" aria-label="Cart summary">
      <Link href="/cart" className="kk-cart-bar__link">
        <span className="kk-cart-bar__count">
          <i className="bi bi-bag-fill" aria-hidden="true" />
          {count} {count === 1 ? "item" : "items"}
        </span>
        <span className="kk-cart-bar__cta">
          View cart
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </span>
        <span className="kk-cart-bar__total tabular-nums">₱{total.toFixed(2)}</span>
      </Link>
    </div>
  );
}
