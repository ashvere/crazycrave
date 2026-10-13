import Link from "next/link";
import { BRAND_LOGO_SRC } from "@/lib/brand";

type RiderTopbarProps = {
  displayName: string;
};

export function RiderTopbar({ displayName }: RiderTopbarProps) {
  return (
    <header className="rider-topbar">
      <div className="container-fluid rider-topbar__inner">
        <Link href="/rider" className="rider-topbar__brand">
          <span className="rider-topbar__logo-wrap" aria-hidden="true">
            <img src={BRAND_LOGO_SRC} alt="" width={28} height={28} decoding="async" />
          </span>
          <span className="rider-topbar__brand-text">
            <span className="rider-topbar__brand-label">Rider portal</span>
            <span className="rider-topbar__brand-name">Crispy Crave</span>
          </span>
        </Link>
        <div className="rider-topbar__actions">
          <span className="rider-topbar__user">
            <i className="bi bi-person-circle" aria-hidden="true" />
            <span>{displayName}</span>
          </span>
          {/* Plain <a>, not <Link>: Next prefetches visible Links, and prefetching /logout signs the user out. */}
          <a href="/rider/logout" className="rider-topbar__logout">
            Log out
          </a>
        </div>
      </div>
    </header>
  );
}
