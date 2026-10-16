import type { SupabaseClient } from "@supabase/supabase-js";

export type RiderOrderRow = {
  id: number;
  customer_id: string | null;
  customer_display_name: string;
  customer_phone?: string | null;
  shop_id: number;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  delivery_status: string;
  delivery_address: string;
  barangay: string;
  distance_km?: number | null;
  rider_fee?: number | null;
  rider_id: string | null;
  created_at: string;
  delivery_proof_url: string | null;
  delivery_proof_note: string | null;
  delivery_proof_at: string | null;
};

export type RiderOrderItemRow = {
  id: number;
  order_id: number;
  menu_id: number;
  menu_name: string;
  price: number;
  quantity: number;
};

export type RiderProfileRow = {
  display_name: string | null;
  role: string;
  approval_status: string;
  restaurant_id: number | null;
};

export async function fetchRiderProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<RiderProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, role, approval_status, restaurant_id")
    .eq("id", userId)
    .maybeSingle();
  return (data as RiderProfileRow | null) ?? null;
}

export async function fetchRiderOrders(
  supabase: SupabaseClient
): Promise<RiderOrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchRiderOrders", error.message);
    return [];
  }
  return (data as RiderOrderRow[]) ?? [];
}

/** Claim pool order for this rider (RLS must allow). Returns false if not claimable. */
export async function claimRiderOrder(
  supabase: SupabaseClient,
  orderId: number,
  riderId: string
): Promise<boolean> {
  const { data: row } = await supabase
    .from("orders")
    .select("id, rider_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!row) return false;
  if (row.rider_id === riderId) return true;
  if (row.rider_id) return false;

  const { error } = await supabase
    .from("orders")
    .update({ rider_id: riderId, delivery_status: "assigned" })
    .eq("id", orderId)
    .is("rider_id", null);

  return !error;
}

export async function fetchRiderOrderById(
  supabase: SupabaseClient,
  orderId: number
): Promise<RiderOrderRow | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.error("fetchRiderOrderById", error.message);
    return null;
  }
  return (data as RiderOrderRow | null) ?? null;
}

export async function fetchOrderItems(
  supabase: SupabaseClient,
  orderId: number
): Promise<RiderOrderItemRow[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("id", { ascending: true });
  if (error) {
    console.error("fetchOrderItems", error.message);
    return [];
  }
  return (data as RiderOrderItemRow[]) ?? [];
}
