import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  COOKIE_CART,
  cartItemCount,
  parseCartJson,
} from "@/lib/cart-cookies";
import { StaffTopbar } from "@/components/store/staff-topbar";
import type { ProfileRole } from "@/lib/roles";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { MobileTabBar } from "@/components/store/mobile-tab-bar";

export async function StoreHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let role: ProfileRole | string | null = null;
  let restaurantId: number | null = null;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("display_name, role, restaurant_id")
      .eq("id", user.id)
      .maybeSingle();
    displayName = (p?.display_name as string | null) ?? user.email ?? null;
    role = (p?.role as ProfileRole) ?? "user";
    const rid = p?.restaurant_id as number | null | undefined;
    restaurantId = typeof rid === "number" && Number.isFinite(rid) ? rid : null;
  }

  const cookieStore = await cookies();
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  const cartCount = cartItemCount(cart);

  if (role === "admin" || role === "restaurant") {
    return (
      <StaffTopbar
        displayName={displayName ?? "Staff"}
        role={role}
        restaurantId={restaurantId}
      />
    );
  }

  const bodyClass = user ? "has-session" : "";

  return (
    <>
    <header className={`main-header ${bodyClass}`.trim()}>
      <div
        className={`header-inner${user ? " header-inner--session" : ""}`.trim()}
      >
        <div className="header-left">
          <Link href="/" className="brand-link">
            <img src={BRAND_LOGO_SRC} className="logo" alt="Crispy Crave" />
            <span className="brand-name">Crispy Crave</span>
          </Link>
        </div>

        <div className="header-cluster">
          <nav className="header-nav" aria-label="Main">
            <Link href="/">Home</Link>
            <Link href="/#shops">Order now</Link>
          </nav>

          <div className="header-meta">
            <span className="info d-inline-flex align-items-center gap-1">
              <i className="bi bi-clock" aria-hidden="true" />
              <span>10AM – 10PM</span>
            </span>
            <span className="info d-inline-flex align-items-center gap-1">
              <i className="bi bi-telephone" aria-hidden="true" />
              <a href="tel:+639389762763" className="header-meta__tel">
                09389762763
              </a>
            </span>
          </div>
        </div>

        <div className="header-actions">
          {role === "rider" ? (
            <Link href="/rider" className="user-btn">
              <i className="bi bi-bicycle me-1" aria-hidden="true" />
              <span className="d-none d-sm-inline">Rider portal</span>
              <span className="d-sm-none">Rider</span>
            </Link>
          ) : null}
          {role === "user" ? (
            <>
              <Link href="/cart" className="cart-btn position-relative kk-hide-phone" aria-label="Cart">
                <span className="d-none d-sm-inline">Cart</span>
                <i className="bi bi-cart3 d-sm-none fs-5" aria-hidden="true" />
                <span className="visually-hidden d-sm-none">Cart</span>
                {cartCount > 0 ? (
                  <span className="cart-badge">{cartCount}</span>
                ) : null}
              </Link>
              <Link href="/my-orders" className="user-btn kk-hide-phone">
                <span className="d-none d-sm-inline">My orders</span>
                <span className="d-sm-none">Orders</span>
              </Link>
              <Link href="/profile" className="user-btn d-none d-md-inline-flex">
                Profile
              </Link>
            </>
          ) : null}

          {user ? (
            <>
              {role === "user" ? (
                <Link
                  href="/profile"
                  className="user-name user-name--link kk-hide-phone"
                  title="Your profile"
                >
                  {displayName}
                </Link>
              ) : (
                <span className="user-name" title={displayName ?? ""}>
                  {displayName}
                </span>
              )}
              <Link href="/logout" className="logout-btn" aria-label="Log out">
                <i className="bi bi-box-arrow-right kk-show-phone" aria-hidden="true" />
                <span className="kk-hide-phone">Log out</span>
              </Link>
            </>
          ) : (
            <button
              type="button"
              className="register-btn"
              data-bs-toggle="modal"
              data-bs-target="#kkAuthModal"
              data-auth-tab="register"
              aria-haspopup="dialog"
            >
              <span className="kk-hide-phone">Get started</span>
              <span className="kk-show-phone">Sign up</span>
            </button>
          )}
        </div>
      </div>
    </header>
    {role !== "rider" ? <MobileTabBar loggedIn={!!user} cartCount={cartCount} /> : null}
    </>
  );
}
