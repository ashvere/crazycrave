import Link from "next/link";
import type { ShopOption } from "@/lib/admin-shop-scope";

/** Shop switcher for platform admins on per-shop pages (Menu, KDS, POS). */
export function ShopPicker({
  basePath,
  shops,
  current,
  inline = false,
}: {
  basePath: string;
  shops: ShopOption[];
  current: number | null;
  /** Render just the pills, for use inside another filter row. */
  inline?: boolean;
}) {
  if (shops.length === 0) {
    if (inline) return null;
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
  const pills = shops.map((s) => (
    <Link
      key={s.id}
      href={`${basePath}?shop_id=${s.id}`}
      className={`btn btn-sm rounded-pill px-3 ${s.id === current ? "btn-dark" : "btn-outline-secondary bg-white"}`}
      aria-current={s.id === current ? "page" : undefined}
    >
      {s.name}
    </Link>
  ));
  if (inline) return <>{pills}</>;
  return (
    <nav className="d-flex flex-wrap gap-2 mb-3" aria-label="Choose shop">
      {pills}
    </nav>
  );
}
