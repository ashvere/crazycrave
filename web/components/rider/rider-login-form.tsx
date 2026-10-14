"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LOGO_SRC } from "@/lib/brand";

export function RiderLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qErr = searchParams.get("error");
  const banner =
    qErr === "forbidden"
      ? "This portal is for approved riders only."
      : qErr === "not_rider"
        ? "Sign in with a rider account."
        : null;

  async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const supabase = createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      setLoading(false);
      setErr(signErr.message);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setErr("Could not load session.");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, approval_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "rider" || profile?.approval_status !== "approved") {
      await supabase.auth.signOut();
      setLoading(false);
      if (profile?.role === "rider" && profile?.approval_status === "pending") {
        setErr("Your rider account is pending admin approval. Check back after you are approved.");
      } else {
        setErr(
          "This portal is for approved delivery partners. Customer accounts cannot sign in here."
        );
      }
      return;
    }

    router.push("/rider");
    router.refresh();
  }

  return (
    <div className="rider-login-shell">
      <aside
        className="rider-login-visual"
        style={{ ["--rider-login-bg" as string]: "url('/images/rider.jpg')" }}
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
          <h1 className="rider-login-visual__title">Rider portal</h1>
          <p className="rider-login-visual__text">
            Pick up orders, update delivery status, and navigate to customers — all in one place.
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
              <span className="rider-login-panel__badge">
                <i className="bi bi-bicycle" aria-hidden="true" /> Riders only
              </span>
              <h2 className="rider-login-panel__title">Sign in</h2>
              <p className="rider-login-panel__lede">
                Delivery partner access. Customer accounts cannot sign in here.
              </p>
            </div>

            {banner ? (
              <div className="alert alert-warning rider-login-alert" role="alert">
                {banner}
              </div>
            ) : null}
            {err ? (
              <div className="alert alert-danger rider-login-alert" role="alert">
                {err}
              </div>
            ) : null}

            <form className="rider-login-form" onSubmit={onSignIn} noValidate>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="rider-email">
                  Rider email
                </label>
                <input
                  type="email"
                  className="form-control rider-login-input"
                  id="rider-email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="rider@example.com"
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold" htmlFor="rider-password">
                  Password
                </label>
                <div className="input-group rider-login-password">
                  <input
                    type="password"
                    className="form-control rider-login-input"
                    id="rider-password"
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary rider-login-toggle-pw"
                    aria-controls="rider-password"
                    aria-label="Show password"
                    onClick={(ev) => {
                      const btn = ev.currentTarget;
                      const inp = document.getElementById(
                        btn.getAttribute("aria-controls") ?? ""
                      ) as HTMLInputElement | null;
                      if (!inp) return;
                      const show = inp.type === "password";
                      inp.type = show ? "text" : "password";
                      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
                      const ic = btn.querySelector("i");
                      if (ic) ic.className = show ? "bi bi-eye-slash" : "bi bi-eye";
                    }}
                  >
                    <i className="bi bi-eye" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-dark w-100 fw-semibold rider-login-submit"
                disabled={loading}
              >
                <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
                Sign in to deliveries
              </button>
            </form>

            <p className="rider-login-panel__note">
              New rider? <Link href="/rider/apply">Apply here</Link>
              {" · "}
              <Link href="/">Customer site</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
