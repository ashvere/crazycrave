"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_LOGO_SRC } from "@/lib/brand";

type Step = 1 | 2;

type Draft = {
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: string;
  vehiclePlate: string;
};

const initialDraft: Draft = {
  name: "",
  email: "",
  phone: "",
  password: "",
  vehicleType: "motorcycle",
  vehiclePlate: "",
};

export function RiderApplyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = searchParams.get("step");
    if (s === "2") setStep(2);
  }, [searchParams]);

  useEffect(() => {
    if (step === 2 && !draft.email) {
      setStep(1);
      router.replace("/rider/apply");
    }
  }, [step, draft.email, router]);

  const goStep2 = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get("name") ?? "").trim();
      const email = String(fd.get("email") ?? "").trim();
      const phone = String(fd.get("phone") ?? "").trim();
      const password = String(fd.get("password") ?? "");
      const vehicleType = String(fd.get("vehicle_type") ?? "motorcycle");
      const vehiclePlate = String(fd.get("vehicle_plate") ?? "").trim();
      if (name === "" || email === "" || phone === "" || password.length < 6) {
        setError("Please complete all required fields (password must be 6+ characters).");
        return;
      }
      setDraft({ name, email, phone, password, vehicleType, vehiclePlate });
      setStep(2);
      router.replace("/rider/apply?step=2");
    },
    [router]
  );

  async function onSubmitDocuments(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formEl = e.currentTarget;
    const fd = new FormData();
    fd.set("name", draft.name);
    fd.set("email", draft.email);
    fd.set("phone", draft.phone);
    fd.set("password", draft.password);
    fd.set("vehicle_type", draft.vehicleType);
    fd.set("vehicle_plate", draft.vehiclePlate);
    const licEl = formEl.elements.namedItem("doc_license");
    const idEl = formEl.elements.namedItem("doc_id");
    const licFile =
      licEl instanceof HTMLInputElement && licEl.files?.length ? licEl.files[0] : null;
    const idFile = idEl instanceof HTMLInputElement && idEl.files?.length ? idEl.files[0] : null;
    if (!licFile) {
      setLoading(false);
      setError("Please upload your driver's license.");
      return;
    }
    if (!idFile) {
      setLoading(false);
      setError("Please upload a valid ID.");
      return;
    }
    fd.set("doc_license", licFile);
    fd.set("doc_id", idFile);

    try {
      const res = await fetch("/api/rider/apply", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit application.");
        setLoading(false);
        return;
      }
      setSuccess(data.message ?? "Application submitted!");
      setDraft(initialDraft);
      setStep(1);
      router.replace("/rider/apply");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="rider-login-shell rider-login-shell--apply">
      <aside
        className="rider-login-visual rider-login-visual--apply"
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
          <h1 className="rider-login-visual__title">Rider sign-up</h1>
          <p className="rider-login-visual__text">
            Register, upload your documents, and start delivering when approved.
          </p>
        </div>
      </aside>

      <main className="rider-login-panel rider-login-panel--apply">
        <div className="rider-apply-panel-wrap">
          <div className="rider-login-panel__card rider-apply-card">
            <div className="rider-login-panel__inner">
              <Link href="/rider/login" className="rider-login-panel__back rider-login-panel__back--pill">
                <i className="bi bi-arrow-left" aria-hidden="true" />
                <span>Rider sign in</span>
              </Link>

              {success ? (
                <div className="rider-apply-success" role="status">
                  <span className="rider-apply-success__icon" aria-hidden="true">
                    <i className="bi bi-check-circle-fill" />
                  </span>
                  <h2 className="rider-login-panel__title">You&apos;re all set</h2>
                  <p className="rider-login-panel__lede">{success}</p>
                  <Link href="/rider/login" className="btn btn-dark w-100 rider-login-submit">
                    Go to rider sign in
                  </Link>
                </div>
              ) : (
                <>
                  <ol className="rider-apply-steps" aria-label="Sign-up progress">
                    <li
                      className={`rider-apply-steps__item${step >= 1 ? " rider-apply-steps__item--active" : ""}${step > 1 ? " rider-apply-steps__item--done" : ""}`}
                    >
                      <span className="rider-apply-steps__num">1</span>
                      <span className="rider-apply-steps__label">Account</span>
                    </li>
                    <li
                      className={`rider-apply-steps__item${step >= 2 ? " rider-apply-steps__item--active" : ""}`}
                    >
                      <span className="rider-apply-steps__num">2</span>
                      <span className="rider-apply-steps__label">Documents</span>
                    </li>
                  </ol>

                  {error ? (
                    <div className="alert alert-danger rider-login-alert py-2" role="alert">
                      {error}
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <>
                      <h2 className="rider-login-panel__title">Your details</h2>
                      <p className="rider-login-panel__lede rider-login-panel__lede--tight">
                        Create your rider account. Step 2 uploads your license and ID.
                      </p>

                      <form
                        method="post"
                        className="rider-login-form rider-apply-form"
                        onSubmit={goStep2}
                        noValidate
                      >
                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label" htmlFor="apply-name">
                              Full name
                            </label>
                            <input
                              id="apply-name"
                              type="text"
                              name="name"
                              className="form-control form-control-sm rider-login-input"
                              required
                              defaultValue={draft.name}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="apply-email">
                              Email
                            </label>
                            <input
                              id="apply-email"
                              type="email"
                              name="email"
                              className="form-control form-control-sm rider-login-input"
                              required
                              autoComplete="email"
                              defaultValue={draft.email}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="apply-phone">
                              Phone
                            </label>
                            <input
                              id="apply-phone"
                              type="tel"
                              name="phone"
                              className="form-control form-control-sm rider-login-input"
                              required
                              autoComplete="tel"
                              defaultValue={draft.phone}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="apply-password">
                              Password
                            </label>
                            <input
                              id="apply-password"
                              type="password"
                              name="password"
                              className="form-control form-control-sm rider-login-input"
                              minLength={6}
                              required
                              autoComplete="new-password"
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="apply-vehicle">
                              Vehicle
                            </label>
                            <select
                              id="apply-vehicle"
                              name="vehicle_type"
                              className="form-select form-select-sm rider-login-input"
                              required
                              defaultValue={draft.vehicleType}
                            >
                              <option value="motorcycle">Motorcycle</option>
                              <option value="bicycle">Bicycle</option>
                              <option value="car">Car</option>
                            </select>
                          </div>
                          <div className="col-12">
                            <label className="form-label" htmlFor="apply-plate">
                              Plate no. <span className="text-muted fw-normal">(optional)</span>
                            </label>
                            <input
                              id="apply-plate"
                              type="text"
                              name="vehicle_plate"
                              className="form-control form-control-sm rider-login-input"
                              defaultValue={draft.vehiclePlate}
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-dark w-100 rider-login-submit mt-2">
                          Continue to documents
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <h2 className="rider-login-panel__title">Upload documents</h2>
                      <p className="rider-login-panel__lede rider-login-panel__lede--tight">
                        Admin will review before you can sign in.
                      </p>

                      <div className="rider-apply-review small text-muted mb-2">
                        <strong className="text-dark">{draft.name}</strong>
                        {" · "}
                        {draft.email}
                      </div>

                      <form
                        className="rider-login-form rider-apply-form"
                        onSubmit={onSubmitDocuments}
                        noValidate
                      >
                        <div className="mb-2">
                          <label className="form-label" htmlFor="apply-license">
                            Driver&apos;s license
                          </label>
                          <input
                            id="apply-license"
                            type="file"
                            name="doc_license"
                            className="form-control form-control-sm"
                            accept="image/*,.pdf,application/pdf"
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label" htmlFor="apply-id">
                            Valid ID
                          </label>
                          <input
                            id="apply-id"
                            type="file"
                            name="doc_id"
                            className="form-control form-control-sm"
                            accept="image/*,.pdf,application/pdf"
                            required
                          />
                        </div>
                        <div className="d-flex flex-column flex-sm-row gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary flex-fill rider-login-submit"
                            onClick={() => {
                              setStep(1);
                              router.replace("/rider/apply");
                            }}
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            className="btn btn-dark flex-fill rider-login-submit"
                            disabled={loading}
                          >
                            {loading ? "Submitting…" : "Submit application"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
