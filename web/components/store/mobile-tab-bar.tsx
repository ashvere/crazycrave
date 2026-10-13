"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** App-style bottom navigation for phones (hidden from 768px up via CSS). */
export function MobileTabBar({ loggedIn, cartCount }: { loggedIn: boolean; cartCount: number }) {
  const path = usePathname();
  const active = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

  const tab = (href: string, icon: string, label: string, extra?: React.ReactNode) => (
    <Link
      href={href}
      className={`kk-tabbar__item${active(href) ? " is-active" : ""}`}
      aria-current={active(href) ? "page" : undefined}
    >
      <span className="kk-tabbar__icon">
        <i className={`bi ${icon}${active(href) ? "-fill" : ""}`} aria-hidden="true" />
        {extra}
      </span>
      <span className="kk-tabbar__label">{label}</span>
    </Link>
  );

  return (
    <nav className="kk-tabbar" aria-label="App navigation">
      {tab("/", "bi-house-door", "Home")}
      {tab("/#shops", "bi-shop", "Shops")}
      {tab(
        "/cart",
        "bi-bag",
        "Cart",
        cartCount > 0 ? (
          <span className="kk-tabbar__badge" aria-label={`${cartCount} items`}>
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        ) : null
      )}
      {tab("/my-orders", "bi-receipt", "Orders")}
      {loggedIn ? (
        tab("/profile", "bi-person", "Account")
      ) : (
        <button
          type="button"
          className="kk-tabbar__item"
          data-bs-toggle="modal"
          data-bs-target="#kkAuthModal"
          data-auth-tab="login"
        >
          <span className="kk-tabbar__icon">
            <i className="bi bi-person-circle" aria-hidden="true" />
          </span>
          <span className="kk-tabbar__label">Log in</span>
        </button>
      )}
    </nav>
  );
}
