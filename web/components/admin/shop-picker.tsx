import Link from "next/link";
import type { ShopOption } from "@/lib/admin-shop-scope";
import { shopLogoSrc } from "@/lib/shop-logos";

/** Shop switcher for platform admins on per-shop pages (Menu, KDS, POS, kitchen pages). */
export function ShopPicker({
  basePath,
  shops,
  current,
  allLabel,
}: {
  basePath: string;
  shops: ShopOption[];
  current: number | null;
  /** Adds a first "all shops" item linking to `basePath` (active when `current` is null). */
  allLabel?: string;
}) {
  if (shops.length === 0) {
    return (
      <div className="staff-empty-panel">
        <i className="bi bi-shop" aria-hidden="true" />
        <p>No shops yet.</p>
        <Link href="/admin/shops/new" className="staff-btn staff-btn--primary">
          Add shop
        </Link>
      </div>
    );
  }
  return (
    <nav className="shop-switch" aria-label="Choose shop">
      {allLabel ? (
        <Link
          href={basePath}
          className={`shop-switch__item${current === null ? " is-active" : ""}`}
          aria-current={current === null ? "page" : undefined}
        >
          <span className="shop-switch__icon" aria-hidden="true">
            <i className="bi bi-grid" />
          </span>
          {allLabel}
        </Link>
      ) : null}
      {shops.map((s) => (
        <Link
          key={s.id}
          href={`${basePath}?shop_id=${s.id}`}
          className={`shop-switch__item${s.id === current ? " is-active" : ""}`}
          aria-current={s.id === current ? "page" : undefined}
        >
          <img src={shopLogoSrc(s.logo)} alt="" className="shop-switch__logo" />
          {s.name}
        </Link>
      ))}
    </nav>
  );
}
