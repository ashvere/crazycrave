import { manilaDay } from "@/lib/site-visits";

/** Reference number printed on receipts, same format as legacy order-success.php: KK-YYYYMMDD-000123. */
export function orderReference(id: number, createdAt: string): string {
  return `KK-${manilaDay(new Date(createdAt)).replace(/-/g, "")}-${String(id).padStart(6, "0")}`;
}

/** Checkout appends "GCash reference: …" to delivery_address (no dedicated column). */
export function gcashReference(deliveryAddress: string | null | undefined): string | null {
  const m = /GCash reference:\s*(.+)/i.exec(deliveryAddress ?? "");
  return m ? m[1].trim() : null;
}

/** The address without the notes checkout appends after a blank line. */
export function addressOnly(deliveryAddress: string | null | undefined): string {
  return String(deliveryAddress ?? "").split(/\n\s*\n/)[0].trim();
}

export type ReceiptOrder = {
  id: number;
  created_at: string;
  total: number;
  rider_fee: number;
  distance_km: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  barangay: string;
  delivery_address: string;
  customer_display_name: string;
  customer_phone?: string | null;
  shopName: string;
  items: { menu_name: string; price: number; quantity: number }[];
};
