'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authErrorMessage, ensureAuthErrorText } from '@/lib/auth-errors';
import { BRAND_LOGO_SRC } from '@/lib/brand';

const SIGNUP_TIMEOUT_MS = 20_000;

/** Same-site path to return to after login (`?next=`), or null. */
function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}

export function AuthModalOpener() {
  // Re-run on client-side navigations too (the footer stays mounted), e.g. a tab-bar
  // tap on /my-orders that the server redirects to /?login=required.
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const needOpen =
      params.get('login') === 'required' ||
      params.get('auth') === 'login' ||
      params.get('auth') === 'error';
    if (!needOpen) return;

    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      const el = document.getElementById('kkAuthModal');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const B = (window as unknown as { bootstrap?: any }).bootstrap;
      if (el && B?.Modal) {
        B.Modal.getOrCreateInstance(el).show();
        window.clearInterval(id);
        params.delete('login');
        params.delete('auth');
        params.delete('message');
        const qs = params.toString();
        const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
        window.history.replaceState({}, '', next);
      } else if (attempts > 40) {
        window.clearInterval(id);
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [searchParams]);

  return null;
}

export function AuthModal() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'error') {
      const msg = params.get('message');
      setErr(msg ? decodeURIComponent(msg) : 'Sign-in link expired or invalid. Try again.');
    }
  }, []);

  useEffect(() => {
    const el = document.getElementById('kkAuthModal');
    if (!el) return;
    const onHidden = () => {
      setShowLoginPassword(false);
      setShowRegisterPassword(false);
    };
    el.addEventListener('hidden.bs.modal', onHidden);
    return () => el.removeEventListener('hidden.bs.modal', onHidden);
  }, []);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const password = String(fd.get('password') ?? '');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not verified')) {
        setPendingConfirmEmail(email.trim().toLowerCase());
        setErr('Confirm your email first (check inbox and spam), or resend the link below.');
      } else {
        setErr(authErrorMessage(error));
      }
      return;
    }
    setPendingConfirmEmail(null);
    // Go to the page that asked for login (?next=), else stay where the customer was
    // (e.g. cart → checkout), minus the login prompt params.
    const params = new URLSearchParams(window.location.search);
    const next = safeNextPath(params.get('next'));
    params.delete('login');
    params.delete('auth');
    params.delete('message');
    params.delete('next');
    const qs = params.toString();
    window.location.href = next ?? `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  }

  function switchToLoginTab(email?: string) {
    document.getElementById('kk-auth-tab-login')?.click();
    if (email) {
      const input = document.getElementById('kk-login-email') as HTMLInputElement | null;
      if (input) input.value = email;
    }
  }

  async function resendConfirmation() {
    if (!pendingConfirmEmail) return;
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const ac = new AbortController();
      const timer = window.setTimeout(() => ac.abort(), SIGNUP_TIMEOUT_MS);
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingConfirmEmail }),
        signal: ac.signal,
      });
      window.clearTimeout(timer);
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(ensureAuthErrorText((body as { error?: unknown })?.error));
        if ((body as { code?: string })?.code === 'already_registered') {
          switchToLoginTab(pendingConfirmEmail);
        }
        return;
      }
      setOk(
        ensureAuthErrorText((body as { message?: unknown })?.message) ||
          `Confirmation email sent to ${pendingConfirmEmail}. Check spam/junk.`
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setErr('Request timed out. Try again or use Log in if you already have an account.');
      } else {
        setErr('Could not resend email. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');
    const name = String(fd.get('name') ?? '');

    try {
      const ac = new AbortController();
      const timer = window.setTimeout(() => ac.abort(), SIGNUP_TIMEOUT_MS);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
        signal: ac.signal,
      });
      window.clearTimeout(timer);
      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message = ensureAuthErrorText((body as { error?: unknown })?.error);
        setErr(message);
        if (res.status === 409 || (body as { code?: string })?.code === 'already_registered') {
          setPendingConfirmEmail(email);
          switchToLoginTab(email);
        }
        return;
      }

      setPendingConfirmEmail(null);
      setOk(
        ensureAuthErrorText((body as { message?: unknown })?.message) ||
          'Account created. Use the Log in tab with your email and password.'
      );
      switchToLoginTab(email);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setErr(
          'Sign-up timed out (email server may be slow). If you already tried before, use Log in — your account may exist.'
        );
        setPendingConfirmEmail(email);
        switchToLoginTab(email);
      } else {
        setErr('Network error. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal fade"
      id="kkAuthModal"
      tabIndex={-1}
      aria-labelledby="kkAuthModalTitle"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered kk-auth-dialog">
        <div className="modal-content kk-auth-modal">
          <div className="modal-header kk-auth-modal__head">
            <div className="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
              <img
                src={BRAND_LOGO_SRC}
                alt=""
                className="kk-auth-modal__logo flex-shrink-0"
                width={48}
                height={48}
                decoding="async"
              />
              <div className="min-w-0">
                <h2 className="modal-title h5 mb-0" id="kkAuthModalTitle">
                  Crispy Crave
                </h2>
                <p className="text-muted small mb-0 mt-1" id="kkAuthModalSubtitle">
                  Sign in or create an account to order.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="kk-modal-dismiss flex-shrink-0"
              data-bs-dismiss="modal"
              aria-label="Dismiss dialog"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <div className="modal-body pt-2">
            {typeof err === "string" && err.trim().length > 0 && err.trim() !== "{}" ? (
              <div className="alert alert-danger py-2 small" role="alert">
                {err}
              </div>
            ) : null}
            {pendingConfirmEmail ? (
              <p className="small mb-3">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 align-baseline"
                  disabled={loading}
                  onClick={() => void resendConfirmation()}
                >
                  Resend confirmation email
                </button>
              </p>
            ) : null}
            {ok ? (
              <div className="alert alert-success py-2 small" role="status">
                {ok}
              </div>
            ) : null}

            <ul
              className="nav nav-pills nav-fill gap-2 mb-3 kk-auth-tabs"
              role="tablist"
            >
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link active w-100"
                  id="kk-auth-tab-login"
                  data-bs-toggle="pill"
                  data-bs-target="#kk-auth-pane-login"
                  type="button"
                  role="tab"
                  aria-controls="kk-auth-pane-login"
                  aria-selected="true"
                >
                  Log in
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link w-100"
                  id="kk-auth-tab-register"
                  data-bs-toggle="pill"
                  data-bs-target="#kk-auth-pane-register"
                  type="button"
                  role="tab"
                  aria-controls="kk-auth-pane-register"
                  aria-selected="false"
                >
                  Sign up
                </button>
              </li>
            </ul>

            <div className="tab-content">
              <div
                className="tab-pane fade show active"
                id="kk-auth-pane-login"
                role="tabpanel"
                aria-labelledby="kk-auth-tab-login"
                tabIndex={0}
              >
                <form id="kkFormLogin" onSubmit={onLogin} noValidate>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="kk-login-email">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="kk-login-email"
                      name="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="kk-login-password">
                      Password
                    </label>
                    <div className="input-group kk-auth-password-group">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        className="form-control"
                        id="kk-login-password"
                        name="password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary kk-auth-toggle-pw"
                        aria-controls="kk-login-password"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowLoginPassword((v) => !v)}
                      >
                        <i
                          className={`bi ${showLoginPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                          aria-hidden="true"
                        />
                        <span className="visually-hidden kk-auth-toggle-pw__sr">
                          {showLoginPassword ? 'Hide password' : 'Show password'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-dark w-100 fw-semibold"
                    disabled={loading}
                  >
                    Log in
                  </button>
                </form>
              </div>
              <div
                className="tab-pane fade"
                id="kk-auth-pane-register"
                role="tabpanel"
                aria-labelledby="kk-auth-tab-register"
                tabIndex={0}
              >
                <form id="kkFormRegister" onSubmit={onRegister} noValidate>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="kk-reg-name">
                      Full name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="kk-reg-name"
                      name="name"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="kk-reg-email">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="kk-reg-email"
                      name="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="kk-reg-password">
                      Password
                    </label>
                    <div className="input-group kk-auth-password-group">
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        className="form-control"
                        id="kk-reg-password"
                        name="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary kk-auth-toggle-pw"
                        aria-controls="kk-reg-password"
                        aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowRegisterPassword((v) => !v)}
                      >
                        <i
                          className={`bi ${showRegisterPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                          aria-hidden="true"
                        />
                        <span className="visually-hidden kk-auth-toggle-pw__sr">
                          {showRegisterPassword ? 'Hide password' : 'Show password'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-warning w-100 fw-semibold text-dark"
                    disabled={loading}
                  >
                    Create account
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
