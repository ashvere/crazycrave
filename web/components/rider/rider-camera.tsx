"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SIDE = 1600;

function cameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow the camera for this site in your browser settings, or use your phone's camera app below.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device. Use “Choose photo” instead.";
  }
  if (name === "NotReadableError") {
    return "The camera is being used by another app. Close it and try again.";
  }
  return "Couldn't start the camera. Use your phone's camera app below instead.";
}

/**
 * Full-screen live camera (getUserMedia). Calls onCapture with a ≤1600px JPEG.
 * onFallback opens the system camera/file picker when live capture isn't possible.
 */
export function RiderCamera({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // After the rider taps Flip, ask for exactly that camera so we can tell if it exists.
  const flipped = useRef(false);
  const previousFacing = useRef<"environment" | "user">("environment");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setReady(false);
      setError(null);
      stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera here. Use your phone's camera app below.");
        return;
      }
      try {
        const facingMode = flipped.current ? { exact: facing } : { ideal: facing };
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        } catch (err) {
          const name = (err as { name?: string } | null)?.name ?? "";
          if (flipped.current && (name === "OverconstrainedError" || name === "NotFoundError")) {
            // This device has no camera on that side: go back to the one that worked.
            flipped.current = false;
            if (!cancelled) {
              setNotice("This device only has one camera.");
              setFacing(previousFacing.current);
            }
            return;
          }
          throw err;
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setReady(true);
        // Phones always get the Flip button (many don't list both cameras reliably).
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
        if (!cancelled) setCanSwitch(touch || devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch (err) {
        if (!cancelled) setError(cameraError(err));
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  // Close with Escape; keep the page behind from scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function capture() {
    const v = videoRef.current;
    if (!v || !ready || !v.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      // Front camera preview is mirrored; save the photo the right way round.
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, w, h);
    setFlash(true);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], "proof.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.82
    );
  }

  return (
    <div className="rider-cam" role="dialog" aria-modal="true" aria-label="Take a proof photo">
      <div className="rider-cam__top">
        <button type="button" className="rider-cam__icon-btn" onClick={onClose} aria-label="Close camera">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <span className="rider-cam__title">Proof photo</span>
        <span className="rider-cam__spacer" />
      </div>

      <div className="rider-cam__view">
        <video
          ref={videoRef}
          className={`rider-cam__video${facing === "user" ? " is-mirrored" : ""}`}
          playsInline
          muted
          autoPlay
        />
        {flash ? <span className="rider-cam__flash" aria-hidden="true" /> : null}
        {notice ? <p className="rider-cam__notice" role="status">{notice}</p> : null}
        {!ready && !error ? (
          <p className="rider-cam__status">
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            Starting camera…
          </p>
        ) : null}
        {error ? (
          <div className="rider-cam__error" role="alert">
            <i className="bi bi-camera-video-off" aria-hidden="true" />
            <p>{error}</p>
            <button
              type="button"
              className="rider-btn rider-btn--light"
              onClick={() => {
                onClose();
                onFallback();
              }}
            >
              <i className="bi bi-phone" aria-hidden="true" />
              Use phone camera app
            </button>
          </div>
        ) : null}
      </div>

      <div className="rider-cam__controls">
        <span className="rider-cam__side" />
        <button
          type="button"
          className="rider-cam__shutter"
          onClick={capture}
          disabled={!ready}
          aria-label="Take photo"
        >
          <span />
        </button>
        <span className="rider-cam__side">
          {canSwitch ? (
            <button
              type="button"
              className="rider-cam__icon-btn"
              onClick={() => {
                setNotice(null);
                previousFacing.current = facing;
                flipped.current = true;
                setFacing((f) => (f === "environment" ? "user" : "environment"));
              }}
              aria-label={facing === "environment" ? "Switch to front camera" : "Switch to back camera"}
              disabled={!ready}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              <span className="rider-cam__flip-label">Flip</span>
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
