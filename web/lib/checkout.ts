import barangayMap from "@/lib/data/barangay-pototan.json";

/** Barangay → distance (km) from the shop. Server source of truth (mirrors PHP `data/barangay_pototan.php`). */
export const BARANGAY_DISTANCES: Record<string, number> = barangayMap;

export const STORE_PICKUP_BARANGAY = "Store pickup";
export const PRIORITY_SURCHARGE = 30;

export const PAYMENT_OPTIONS = ["cod", "gcash", "bank", "card"] as const;
export type PaymentOption = (typeof PAYMENT_OPTIONS)[number];

export const DELIVERY_OPTIONS = ["standard", "priority", "scheduled"] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

export function isPaymentOption(v: string): v is PaymentOption {
  return (PAYMENT_OPTIONS as readonly string[]).includes(v);
}

export function isDeliveryOption(v: string): v is DeliveryOption {
  return (DELIVERY_OPTIONS as readonly string[]).includes(v);
}

export const BASE_RIDER_FEE = 50;
export const BASE_RIDER_KM = 5;
export const EXTRA_KM_FEE = 15;

/** Rider fee: ₱50 for the first 5 km, +₱15 per started km beyond that, plus surcharge for priority. */
export function riderFeeFor(distanceKm: number, option: DeliveryOption): number {
  const extraKm = Math.max(0, Math.ceil(distanceKm - BASE_RIDER_KM));
  const base = BASE_RIDER_FEE + extraKm * EXTRA_KM_FEE;
  return option === "priority" ? base + PRIORITY_SURCHARGE : base;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Normalizes a Philippine contact number to local format (09171234567 / 0331234567).
 * Accepts spaces, dashes and +63 / 63 prefixes. Returns null if it isn't a plausible PH number.
 */
export function normalizePhPhone(raw: string): string | null {
  let d = raw.replace(/[\s\-().]/g, "");
  if (d.startsWith("+63")) d = `0${d.slice(3)}`;
  else if (/^63\d{10}$/.test(d)) d = `0${d.slice(2)}`;
  else if (/^9\d{9}$/.test(d)) d = `0${d}`;
  return /^0\d{9,10}$/.test(d) ? d : null;
}
