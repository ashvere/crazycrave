/** Realtime presence channel the storefront joins; the admin Overview counts who is in it. */
export const LIVE_CHANNEL = "storefront-live";

/** Private bucket holding one empty object per visitor per day: `<yyyy-mm-dd>/<visitorId>`. */
export const VISITS_BUCKET = "site-visits";

/** Calendar day in the Philippines (orders and visits are bucketed by local day). */
export function manilaDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Midnight (Manila) of a yyyy-mm-dd day, as a Date. */
export function manilaMidnight(day: string): Date {
  return new Date(`${day}T00:00:00+08:00`);
}
