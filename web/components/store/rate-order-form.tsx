"use client";

import { useState } from "react";
import { rateOrder } from "@/app/(store)/order-track/actions";

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

function StarPicker({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="kk-rate__field">
      <legend className="kk-rate__label">{label}</legend>
      <div className="kk-rate__stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="kk-rate__star" onMouseEnter={() => setHover(n)}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="visually-hidden"
            />
            <i className={`bi ${shown >= n ? "bi-star-fill" : "bi-star"}`} aria-hidden="true" />
            <span className="visually-hidden">
              {n} star{n === 1 ? "" : "s"}
            </span>
          </label>
        ))}
        <span className="kk-rate__word" aria-live="polite">
          {WORDS[shown]}
        </span>
      </div>
    </fieldset>
  );
}

export function RateOrderForm({
  orderId,
  shopName,
  riderName,
}: {
  orderId: number;
  shopName: string;
  /** null when there's no rider to rate (pickup orders). */
  riderName: string | null;
}) {
  const [food, setFood] = useState(0);
  const [rider, setRider] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = food > 0 && (riderName === null || rider > 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || saving) {
      setError(food === 0 ? "Tap the stars to rate the food." : "Tap the stars to rate your rider.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await rateOrder(new FormData(e.currentTarget));
      if (res && "error" in res) {
        setError(res.error);
        setSaving(false);
      }
    } catch (err) {
      const digest = (err as { digest?: unknown } | null)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
      setError("Couldn't reach the server. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="kk-rate">
      <input type="hidden" name="order_id" value={orderId} />
      <StarPicker name="food_rating" label={`How was the food from ${shopName}?`} value={food} onChange={setFood} />
      {riderName !== null ? (
        <StarPicker name="rider_rating" label={`How was ${riderName}, your rider?`} value={rider} onChange={setRider} />
      ) : null}
      <label className="kk-rate__field">
        <span className="kk-rate__label">
          Comment <span className="kk-rate__optional">optional</span>
        </span>
        <textarea
          name="comment"
          rows={2}
          maxLength={500}
          className="form-control"
          placeholder="Tell us what you liked or what we can do better"
        />
      </label>
      {error ? (
        <p className="kk-rate__error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-dark kk-rate__submit" disabled={saving}>
        {saving ? "Sending…" : "Submit rating"}
      </button>
    </form>
  );
}
