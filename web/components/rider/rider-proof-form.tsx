"use client";

import { useEffect, useRef, useState } from "react";
import { riderMarkDelivered } from "@/app/rider/actions";
import { RiderCamera } from "@/components/rider/rider-camera";

const MAX_SIDE = 1600;
const QUALITY = 0.8;

/** Shrink a phone photo to ≤1600px JPEG so it uploads fast on mobile data. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "proof.jpg", { type: "image/jpeg" });
  } catch {
    return file; // Unsupported format for decoding (e.g. HEIC on some browsers): send as-is.
  }
}

export function RiderProofForm({ orderId, collect }: { orderId: number; collect: string | null }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please choose a photo.");
      return;
    }
    setError(null);
    setPreparing(true);
    const small = await shrink(f);
    setPreparing(false);
    if (small.size > 4 * 1024 * 1024) {
      setError("That photo is too large (max 4 MB). Try taking it again.");
      return;
    }
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  }

  function acceptCaptured(file: File) {
    setCameraOpen(false);
    setError(null);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.delete("proof_photo_camera");
    fd.delete("proof_photo_gallery");
    if (photo) fd.set("proof_photo", photo);
    try {
      const res = await riderMarkDelivered(fd);
      if (res && "error" in res) {
        setError(res.error);
        setSubmitting(false);
      }
    } catch (err) {
      const digest = (err as { digest?: unknown } | null)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rider-card rider-proof">
      <input type="hidden" name="order_id" value={orderId} />

      {collect ? (
        <div className="rider-proof__collect">
          <i className="bi bi-cash-coin" aria-hidden="true" />
          <span>
            Collect <strong className="tabular-nums">{collect}</strong> cash from the customer.
          </span>
        </div>
      ) : null}

      <p className="rider-form__label mb-2">
        Proof photo <span className="rider-proof__optional">optional</span>
      </p>

      {preview ? (
        <div className="rider-proof__preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Proof of delivery preview" />
          <button
            type="button"
            className="rider-proof__remove"
            onClick={() => {
              setPhoto(null);
              setPreview(null);
            }}
            aria-label="Remove photo"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
          <span className="rider-proof__size">{Math.max(1, Math.round((photo?.size ?? 0) / 1024))} KB</span>
          <button type="button" className="rider-proof__retake" onClick={() => setCameraOpen(true)}>
            <i className="bi bi-camera" aria-hidden="true" /> Retake
          </button>
        </div>
      ) : (
        <div className="rider-btn-row rider-btn-row--2">
          <button
            type="button"
            className="rider-btn rider-btn--dark"
            onClick={() => setCameraOpen(true)}
            disabled={preparing}
          >
            <i className="bi bi-camera-fill" aria-hidden="true" />
            Take photo
          </button>
          <button
            type="button"
            className="rider-btn rider-btn--light"
            onClick={() => galleryRef.current?.click()}
            disabled={preparing}
          >
            <i className="bi bi-image" aria-hidden="true" />
            Choose photo
          </button>
        </div>
      )}
      {preparing ? <p className="rider-form__hint mt-2 mb-0">Preparing photo…</p> : null}

      {cameraOpen ? (
        <RiderCamera
          onCapture={acceptCaptured}
          onClose={() => setCameraOpen(false)}
          onFallback={() => cameraRef.current?.click()}
        />
      ) : null}

      <input
        ref={cameraRef}
        type="file"
        name="proof_photo_camera"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        tabIndex={-1}
        onChange={pick}
      />
      <input
        ref={galleryRef}
        type="file"
        name="proof_photo_gallery"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        tabIndex={-1}
        onChange={pick}
      />
      <p className="rider-form__hint mt-2 mb-3">
        A photo of the food at the door or handed to the customer. Only you and the shop can see it.
      </p>

      <label className="rider-form__field mb-3">
        <span className="rider-form__label">
          Note <span className="rider-proof__optional">optional</span>
        </span>
        <textarea
          name="delivery_proof_note"
          className="form-control"
          rows={2}
          maxLength={500}
          placeholder="e.g. Left with the guard at the gate"
        />
      </label>

      {error ? (
        <div className="alert alert-danger rider-alert" role="alert">
          <i className="bi bi-exclamation-circle-fill me-2" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <button type="submit" className="rider-btn rider-btn--green w-100" disabled={submitting || preparing}>
        {submitting ? (
          <>
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
            {photo ? "Uploading photo…" : "Completing…"}
          </>
        ) : (
          <>
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            Complete delivery
          </>
        )}
      </button>
    </form>
  );
}
