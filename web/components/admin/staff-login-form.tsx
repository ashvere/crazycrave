"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { staffSignIn } from "@/app/admin/actions";
import { BRAND_LOGO_SRC } from "@/lib/brand";

const KITCHEN_BG = "/images/kitchen.jpg";

/** Set just before a sign-in attempt, so a bounce back here can be told apart from a plain visit. */
const JUST_SIGNED_IN_KEY = "kk-staff-just-signed-in";

function readJustSignedIn(): boolean {
  try {
    const at = Number(window.sessionStorage.getItem(JUST_SIGNED_IN_KEY) ?? "");
    window.sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
    return Number.isFinite(at) && Date.now() - at < 60_000;
  } catch {
    return false;
  }
}

function markSigningIn() {
  try {
    window.sessionStorage.setItem(JUST_SIGNED_IN_KEY, String(Date.now()));
  } catch {
    // Storage blocked — the bounce message just won't show.
  }
}

function describeThrown(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/server action/i.test(msg)) {
    return "This page is out of date (the site was updated). Reload the page (Ctrl+Shift+R, or close and reopen the tab) and sign in again.";
  }
  if (/fetch|network|load failed/i.test(msg)) {
    return `Could not reach the server — check your internet connection and try again. (${msg})`;
  }
  return `Something went wrong while signing in: ${msg}`;
}

export function StaffLoginForm() {
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const required = searchParams.get("required") === "1";
  const reason = searchParams.get("reason");

  // Signed in successfully, but the portal sent us straight back: explain why.
  useEffect(() => {
    if (!readJustSignedIn()) return;
    if (reason === "session") {
      setErr(
        "Your password was accepted, but your browser didn't keep you signed in. Allow cookies for this site (turn off strict tracking protection / private-mode cookie blocking), or try another browser."
      );
    } else if (reason === "role") {
      setErr(
        "You're signed in, but this account isn't set up as staff (role must be admin or restaurant with approval_status approved), or the server couldn't read its profile."
      );
    }
  }, [reason]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("email") ?? "").trim() || !String(fd.get("password") ?? "")) {
      setErr("Enter your work email and password.");
      return;
    }
    if (!navigator.cookieEnabled) {
      setErr("Cookies are turned off in this browser. Staff sign-in needs cookies — enable them and try again.");
      return;
    }
    startTransition(async () => {
      markSigningIn();
      try {
        const result = await staffSignIn(fd);
        if (result && "error" in result) {
          readJustSignedIn();
          setErr(result.error);
        }
      } catch (e) {
        // A successful sign-in redirects (Next handles that itself); let its signal through.
        const digest = (e as { digest?: unknown } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
        readJustSignedIn();
        setErr(describeThrown(e));
      }
    });
  }

  return (
    <div className="rider-login-shell">
      <aside
        className="rider-login-visual admin-login-visual"
        style={{ "--rider-login-bg": `url('${KITCHEN_BG}')` } as React.CSSProperties}
      >
        <div className="rider-login-visual__inner">
          <div className="rider-login-visual__logo-wrap" aria-hidden="true">
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              className="rider-login-visual__logo"
              width={52}
              height={52}
              decoding="async"
            />
          </div>
          <p className="rider-login-visual__brand">Crispy Crave</p>
          <h1 className="rider-login-visual__title">Staff portal</h1>
          <p className="rider-login-visual__text">
            Platform admins and kitchen managers — orders, menus, riders, and shops.
          </p>
        </div>
      </aside>

      <main className="rider-login-panel">
        <div className="rider-login-panel__card">
          <div className="rider-login-panel__inner">
            <Link href="/" className="rider-login-panel__back">
              <i className="bi bi-arrow-left" aria-hidden="true" />
              <span>Back to store</span>
            </Link>

            <div className="rider-login-panel__head">
              <span className="rider-login-panel__badge admin-login-badge">
                <i className="bi bi-shield-lock" aria-hidden="true" /> Staff only
              </span>
              <h2 className="rider-login-panel__title">Sign in</h2>
              <p className="rider-login-panel__lede">
                Admins and kitchen managers sign in here. Customers and riders use their own portals.
              </p>
            </div>

            {required ? (
              <div className="alert alert-info rider-login-alert small" role="status">
                Sign in to open the staff dashboard, orders, and menus.
              </div>
            ) : null}

            {err ? (
              <div className="alert alert-danger rider-login-alert" role="alert">
                {err}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="rider-login-form" noValidate>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="staff-email">
                  Work email
                </label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="form-control rider-login-input"
                  required
                  placeholder="you@crispycrave.com"
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold" htmlFor="staff-password">
                  Password
                </label>
                <div className="input-group rider-login-password">
                  <input
                    id="staff-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="form-control rider-login-input"
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary rider-login-toggle-pw"
                    aria-controls="staff-password"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-dark w-100 fw-semibold rider-login-submit admin-login-submit"
                disabled={pending}
              >
                <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
                {pending ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="rider-login-panel__note">
              <Link href="/">Customer login</Link>
              {" · "}
              <Link href="/rider/login">Rider portal</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
