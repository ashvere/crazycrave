"use client";

import { useEffect, useRef, useState } from "react";

type Stop = { id: number; customer: string; barangay: string; dest: string };

type Fix = { lat: number; lng: number; accuracy: number; at: number };

const timeFmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit" });

function errorText(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Location is blocked. Allow location for this site in your browser settings, then tap Start again.";
  }
  if (err.code === err.POSITION_UNAVAILABLE) return "Can't get a GPS signal right now. Move to an open area and try again.";
  return "Getting your location took too long. Tap Start to try again.";
}

/** Live position from the phone (not stored or shared) + one-tap navigation to each active stop. */
export function RiderGps({ stops }: { stops: Stop[] }) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef<number | null>(null);

  const stop = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  };

  const start = () => {
    if (!("geolocation" in navigator)) {
      setErr("This browser can't share location. Try Chrome or Safari on your phone.");
      return;
    }
    setErr(null);
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (p) =>
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp }),
      (e) => {
        setErr(errorText(e));
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
  };

  useEffect(() => () => stop(), []);

  const origin = fix ? `${fix.lat.toFixed(6)},${fix.lng.toFixed(6)}` : null;
  const navUrl = (dest: string) =>
    `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ""}&destination=${encodeURIComponent(dest)}&travelmode=two_wheeler`;

  return (
    <>
      <section className="rider-dash-surface rider-gps">
        <div className={`rider-gps__pulse${watching && fix ? " is-live" : ""}`} aria-hidden="true">
          <i className="bi bi-geo-alt-fill" />
        </div>
        <div className="rider-gps__body">
          <p className="rider-gps__status">
            {watching ? (fix ? "Location on" : "Finding you…") : "Location off"}
          </p>
          {fix ? (
            <p className="rider-gps__coords tabular-nums">
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
              <span> · ±{Math.round(fix.accuracy)} m · {timeFmt.format(fix.at)}</span>
            </p>
          ) : (
            <p className="rider-gps__coords">Turn on to navigate from where you are.</p>
          )}
        </div>
        <div className="rider-gps__actions">
          {watching ? (
            <button type="button" className="btn btn-outline-secondary rider-btn-pill" onClick={stop}>
              <i className="bi bi-stop-fill me-1" aria-hidden="true" /> Stop
            </button>
          ) : (
            <button type="button" className="btn btn-dark rider-btn-pill" onClick={start}>
              <i className="bi bi-crosshair me-1" aria-hidden="true" /> Start
            </button>
          )}
          {fix ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${origin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-secondary rider-btn-pill"
            >
              <i className="bi bi-map me-1" aria-hidden="true" /> Map
            </a>
          ) : null}
        </div>
      </section>
      {err ? (
        <div className="alert alert-warning rider-alert" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
          {err}
        </div>
      ) : null}
      <p className="rider-gps__note">
        <i className="bi bi-shield-lock" aria-hidden="true" /> Your location stays on this phone. It isn&apos;t saved or
        shared with customers.
      </p>

      <section className="rider-dash-section">
        <h2 className="rider-dash-section__title">
          <i className="bi bi-signpost-split" aria-hidden="true" />
          <span>Active stops</span>
        </h2>
        {stops.length === 0 ? (
          <div className="rider-dash-empty-card" role="status">
            <div className="rider-dash-empty-card__icon" aria-hidden="true">
              <i className="bi bi-signpost" />
            </div>
            <h3 className="rider-dash-empty-card__title">No active deliveries</h3>
            <p className="rider-dash-empty-card__text">Assigned orders will show here with directions.</p>
          </div>
        ) : (
          <ul className="rider-list">
            {stops.map((s) => (
              <li key={s.id} className="rider-list__row rider-list__row--static">
                <span className="rider-list__icon rider-list__icon--amber" aria-hidden="true">
                  <i className="bi bi-geo-alt-fill" />
                </span>
                <span className="rider-list__main">
                  <span className="rider-list__title">
                    Order #{s.id} · {s.customer}
                  </span>
                  <span className="rider-list__sub">{s.barangay || "—"}</span>
                </span>
                <a
                  href={navUrl(s.dest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm rider-btn-pill rider-btn-nav"
                >
                  <i className="bi bi-sign-turn-right me-1" aria-hidden="true" /> Navigate
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
