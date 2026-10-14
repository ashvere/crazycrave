"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createShop, updateShop, type ShopFormState } from "@/app/admin/(portal)/shops/actions";

type Shop = {
  id: number;
  name: string;
  description: string | null;
  delivery_time: string | null;
  is_active: boolean;
  logoSrc: string;
};

export function ShopForm({ mode, shop }: { mode: "create" | "edit"; shop?: Shop }) {
  const [state, action, pending] = useActionState<ShopFormState, FormData>(
    mode === "create" ? createShop : updateShop,
    null
  );
  const [preview, setPreview] = useState<string | null>(shop?.logoSrc ?? null);

  return (
    <form action={action} className="staff-form-card">
      {state?.error ? (
        <p className="alert alert-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {shop ? <input type="hidden" name="id" value={shop.id} /> : null}

      <section className="staff-form-section">
        <h2 className="staff-form-section__title">Shop details</h2>

        <label className="staff-field">
          <span className="staff-field__label">Shop name</span>
          <input type="text" name="name" className="staff-field__input" required defaultValue={shop?.name ?? ""} />
        </label>

        <label className="staff-field">
          <span className="staff-field__label">Description</span>
          <textarea
            name="description"
            className="staff-field__textarea"
            rows={4}
            placeholder="Short description for customers"
            defaultValue={shop?.description ?? ""}
          />
        </label>

        <label className="staff-field">
          <span className="staff-field__label">Delivery time</span>
          <input
            type="text"
            name="delivery_time"
            className="staff-field__input"
            placeholder="e.g. 25-35"
            defaultValue={shop?.delivery_time ?? ""}
          />
          <span className="staff-field__hint">Shown on the shop card (minutes).</span>
        </label>

        <label className="staff-field">
          <span className="staff-field__label">Shop logo</span>
          {preview ? (
            <span className="staff-form-preview">
              <img src={preview} alt="" className="staff-form-preview__img" />
            </span>
          ) : null}
          <input
            type="file"
            name="logo"
            className="staff-field__file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : shop?.logoSrc ?? null);
            }}
          />
          <span className="staff-field__hint">
            JPG, PNG or WebP up to 2 MB, square works best.
            {mode === "edit" ? " Leave empty to keep the current logo." : ""}
          </span>
        </label>

        <label className="form-check mb-3">
          <input
            type="checkbox"
            name="is_active"
            className="form-check-input"
            defaultChecked={shop?.is_active ?? true}
          />
          <span className="form-check-label">Visible to customers</span>
        </label>
      </section>

      {mode === "create" ? (
        <section className="staff-form-section">
          <h2 className="staff-form-section__title">Kitchen manager login (optional)</h2>
          <p className="staff-field__hint" style={{ margin: "-0.5rem 0 1rem" }}>
            This account manages menu, POS, and kitchen for this shop. Leave blank to add one later.
          </p>

          <label className="staff-field">
            <span className="staff-field__label">Email</span>
            <input type="email" name="manager_email" className="staff-field__input" autoComplete="off" />
          </label>

          <label className="staff-field">
            <span className="staff-field__label">Password</span>
            <input
              type="password"
              name="manager_password"
              className="staff-field__input"
              minLength={8}
              autoComplete="new-password"
            />
            <span className="staff-field__hint">At least 8 characters.</span>
          </label>
        </section>
      ) : null}

      <footer className="staff-form-actions">
        <Link href="/admin/shops" className="staff-btn staff-btn--secondary">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Cancel
        </Link>
        <button type="submit" className="staff-btn staff-btn--primary" disabled={pending}>
          <i className="bi bi-check-lg" aria-hidden="true" /> {pending ? "Saving…" : "Save shop"}
        </button>
      </footer>
    </form>
  );
}
