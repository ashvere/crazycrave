import type { ReactNode } from "react";
import Script from "next/script";
import { RiderTopbar } from "@/components/rider/rider-topbar";
import { RiderDockNav } from "@/components/rider/rider-dock-nav";

/** Chrome for rider portal pages: top bar, hero header, dock nav. */
export function RiderPageShell({
  riderName,
  kicker,
  title,
  lede,
  aside,
  children,
}: {
  riderName: string;
  kicker: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <RiderTopbar displayName={riderName} />
      <main className="rider-dash-page">
        <div className="container-fluid rider-dash-page__inner rider-page-docked">
          <header className="rider-dash-hero">
            <div className="rider-dash-hero__copy">
              <p className="rider-dash-header__kicker">{kicker}</p>
              <h1 className="rider-dash-header__title">{title}</h1>
              {lede ? <p className="rider-dash-header__lede">{lede}</p> : null}
            </div>
            {aside}
          </header>
          {children}
        </div>
      </main>
      <RiderDockNav />
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="lazyOnload"
      />
    </>
  );
}
