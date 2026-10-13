import { Suspense } from "react";
import Link from "next/link";
import { AuthModal, AuthModalOpener } from "@/components/store/auth-modal";
import { CrispyAiWidget } from "@/components/store/crispy-ai-widget";

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="main-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-col footer-col--brand">
              <p className="footer-brand">Crispy Crave</p>
              <p className="footer-tagline">Pototan restaurants — order simply, delivered well.</p>
              <p className="footer-fact">
                <i className="bi bi-clock" aria-hidden="true" />
                <span>Open daily, 10AM – 10PM</span>
              </p>
              <p className="footer-fact">
                <i className="bi bi-geo-alt" aria-hidden="true" />
                <span>Local kitchens · delivery &amp; pickup</span>
              </p>
            </div>

            <div className="footer-col">
              <h2 className="footer-col__title">Explore</h2>
              <ul className="footer-links">
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/#shops">Order now</Link>
                </li>
                <li>
                  <Link href="/cart">Your cart</Link>
                </li>
                <li>
                  <Link href="/my-orders">My orders</Link>
                </li>
                <li>
                  <Link href="/profile">Profile</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h2 className="footer-col__title">Legal</h2>
              <ul className="footer-links">
                <li>
                  <Link href="/privacy">Privacy policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms of service</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h2 className="footer-col__title">Contact us</h2>
              <ul className="footer-links footer-links--plain">
                <li>
                  <a href="mailto:supportcrispycrave@gmail.com" className="footer-contact">
                    <i className="bi bi-envelope" aria-hidden="true" />
                    <span>supportcrispycrave@gmail.com</span>
                  </a>
                </li>
                <li>
                  <a href="tel:+639389762763" className="footer-contact">
                    <i className="bi bi-telephone" aria-hidden="true" />
                    <span>09389762763</span>
                  </a>
                </li>
                <li className="footer-contact-note">
                  Questions about orders, accounts, or privacy.
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">
              © {year} Crispy Crave. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <AuthModal />
      <Suspense fallback={null}>
        <AuthModalOpener />
      </Suspense>
      <CrispyAiWidget />
    </>
  );
}
