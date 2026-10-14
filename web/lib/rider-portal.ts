import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchRiderProfile, type RiderProfileRow } from "@/lib/rider-data";

export type RiderContext = {
  supabase: SupabaseClient;
  user: User;
  profile: RiderProfileRow;
  riderName: string;
};

/** Signed-in rider for a portal page (the portal layout already enforces role/approval). */
export async function getRiderContext(): Promise<RiderContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");
  const profile = await fetchRiderProfile(supabase, user.id);
  if (!profile) redirect("/rider/login");
  const riderName = profile.display_name?.trim() || user.email?.split("@")[0] || "Rider";
  return { supabase, user, profile, riderName };
}

export type RiderDeliveryRow = {
  id: number;
  total: number;
  rider_fee: number | null;
  barangay: string;
  delivery_address: string;
  payment_method: string;
  order_status: string;
  delivery_status: string;
  created_at: string;
  delivery_proof_at: string | null;
  customer_display_name: string;
};

/** Every order assigned to this rider, newest first. */
export async function fetchMyDeliveries(
  supabase: SupabaseClient,
  riderId: string
): Promise<RiderDeliveryRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, total, rider_fee, barangay, delivery_address, payment_method, order_status, delivery_status, created_at, delivery_proof_at, customer_display_name"
    )
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("fetchMyDeliveries", error.message);
    return [];
  }
  return (data as RiderDeliveryRow[]) ?? [];
}

export const isDelivered = (o: { delivery_status: string }) => o.delivery_status === "delivered";
export const isCancelled = (o: { order_status: string }) => o.order_status === "cancelled";
export const isActive = (o: RiderDeliveryRow) => !isDelivered(o) && !isCancelled(o) && o.order_status !== "completed";

/** When the delivery finished (proof time if recorded, else when the order was placed). */
export const deliveredAt = (o: RiderDeliveryRow) => new Date(o.delivery_proof_at ?? o.created_at);

export const fee = (o: { rider_fee: number | null }) => Number(o.rider_fee ?? 0) || 0;

/** YYYY-MM-DD in Philippine time. */
export function phDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
}

export const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const phDateTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
