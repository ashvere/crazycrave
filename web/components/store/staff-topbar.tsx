"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_LOGO_SRC } from "@/lib/brand";

type StaffTopbarProps = {
  displayName: string;
  role: "admin" | "restaurant";
  restaurantId?: number | null;
  unreadMessages?: number;
};

function linkClass(active: boolean): string {
  return `staff-topbar__link${active ? " is-active" : ""}`;
}

export function StaffTopbar({ displayName, role, restaurantId, unreadMessages = 0 }: StaffTopbarProps) {
  const pathname = usePathname() ?? "";
  const isPlatform = role === "admin";
  const shopQs = restaurantId != null ? `?shop_id=${restaurantId}` : "?shop_id=";

  const dash = pathname === "/admin";
  const orders = pathname.startsWith("/admin/orders");
  const shops =
    pathname.startsWith("/admin/shops") ||
    pathname.startsWith("/admin/shop"); // future parity with add/edit
  const stats = pathname.startsWith("/admin/stats");
  const riders = pathname.startsWith("/admin/riders");
  const customers = pathname.startsWith("/admin/customers");
  const messages = pathname.startsWith("/admin/messages");
  const reviews = pathname.startsWith("/admin/reviews");
  const earnings = pathname.startsWith("/admin/earnings");
  const kds = pathname.startsWith("/admin/kds");
  const pos = pathname.startsWith("/admin/pos");
  const menu = pathname.startsWith("/admin/menus");
  const stock =
    pathname.startsWith("/admin/inventory") ||
    pathname.startsWith("/admin/purchase-orders") ||
    pathname.startsWith("/admin/waste");
  const recipes =
    pathname.startsWith("/admin/recipes") || pathname.startsWith("/admin/recipe");

  return (
    <header className="staff-topbar">
      <div className="staff-topbar__inner">
        <Link href="/admin" className="staff-topbar__brand">
          <span className="staff-topbar__logo-wrap" aria-hidden="true">
            <img src={BRAND_LOGO_SRC} alt="" width={32} height={32} decoding="async" />
          </span>
          <span className="staff-topbar__brand-text">
            <span className="staff-topbar__brand-label">Staff portal</span>
            <span className="staff-topbar__brand-name">Crispy Crave</span>
          </span>
        </Link>

        <nav className="staff-topbar__nav" aria-label="Staff">
          <Link href="/admin" className={linkClass(dash)} title="Dashboard">
            <i className="bi bi-grid" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/orders" className={linkClass(orders)} title="Orders">
            <i className="bi bi-receipt" aria-hidden="true" />
            <span>Orders</span>
          </Link>
          {isPlatform ? (
            <>
              <Link href="/admin/shops" className={linkClass(shops)} title="Shops">
                <i className="bi bi-shop" aria-hidden="true" />
                <span>Shops</span>
              </Link>
              <Link href="/admin/kds" className={linkClass(kds)} title="KDS">
                <i className="bi bi-display" aria-hidden="true" />
                <span>KDS</span>
              </Link>
              <Link href="/admin/pos" className={linkClass(pos)} title="POS">
                <i className="bi bi-calculator" aria-hidden="true" />
                <span>POS</span>
              </Link>
              <Link href="/admin/menus" className={linkClass(menu)} title="Menu">
                <i className="bi bi-journal-text" aria-hidden="true" />
                <span>Menu</span>
              </Link>
              <Link href="/admin/riders" className={linkClass(riders)} title="Riders">
                <i className="bi bi-bicycle" aria-hidden="true" />
                <span>Riders</span>
              </Link>
              <Link href="/admin/messages" className={linkClass(messages)} title="Messages">
                <i className="bi bi-chat-dots" aria-hidden="true" />
                <span>Messages</span>
                {unreadMessages > 0 ? (
                  <span className="badge rounded-pill text-bg-danger ms-1" aria-label={`${unreadMessages} unread`}>
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
              <Link href="/admin/customers" className={linkClass(customers)} title="Customers">
                <i className="bi bi-people" aria-hidden="true" />
                <span>Customers</span>
              </Link>
              <Link href="/admin/reviews" className={linkClass(reviews)} title="Reviews">
                <i className="bi bi-star" aria-hidden="true" />
                <span>Reviews</span>
              </Link>
              <Link href="/admin/stats" className={linkClass(stats)} title="Stats">
                <i className="bi bi-bar-chart" aria-hidden="true" />
                <span>Stats</span>
              </Link>
            </>
          ) : (
            <>
              <Link href={`/admin/kds${shopQs}`} className={linkClass(kds)} title="KDS">
                <i className="bi bi-display" aria-hidden="true" />
                <span>KDS</span>
              </Link>
              <Link href={`/admin/pos${shopQs}`} className={linkClass(pos)} title="POS">
                <i className="bi bi-calculator" aria-hidden="true" />
                <span>POS</span>
              </Link>
              <Link href={`/admin/menus${shopQs}`} className={linkClass(menu)} title="Menu">
                <i className="bi bi-journal-text" aria-hidden="true" />
                <span>Menu</span>
              </Link>
              <Link href={`/admin/inventory${shopQs}`} className={linkClass(stock)} title="Stock">
                <i className="bi bi-boxes" aria-hidden="true" />
                <span>Stock</span>
              </Link>
              <Link href={`/admin/recipes${shopQs}`} className={linkClass(recipes)} title="Recipes">
                <i className="bi bi-book" aria-hidden="true" />
                <span>Recipes</span>
              </Link>
              <Link href={`/admin/earnings${shopQs}`} className={linkClass(earnings)} title="Earnings">
                <i className="bi bi-cash-stack" aria-hidden="true" />
                <span>Earnings</span>
              </Link>
              <Link href="/admin/reviews" className={linkClass(reviews)} title="Reviews">
                <i className="bi bi-star" aria-hidden="true" />
                <span>Reviews</span>
              </Link>
            </>
          )}
        </nav>

        <div className="staff-topbar__actions">
          <span className="staff-topbar__role-badge">{isPlatform ? "Admin" : "Kitchen"}</span>
          <span className="staff-topbar__user" title={displayName}>
            <i className="bi bi-person-circle" aria-hidden="true" />
            <span className="staff-topbar__user-name">{displayName}</span>
          </span>
          {/* Plain <a>, not <Link>: Next prefetches visible Links, and prefetching /logout signs the user out. */}
          <a href="/logout" className="staff-topbar__logout">
            Log out
          </a>
        </div>
      </div>
    </header>
  );
}
