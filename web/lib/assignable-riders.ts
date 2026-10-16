import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type FleetStatus = "available" | "busy" | "offline";

/** An approved rider staff can pick in an "Assign rider" dropdown. */
export type AssignableRider = {
  id: string;
  display_name: string | null;
  /** Shop the rider delivers for; null = all shops. */
  restaurant_id: number | null;
  /** What the rider set on their profile (no row yet counts as available). */
  fleet_status: FleetStatus;
  /** Deliveries they're on right now. */
  active: number;
};

/**
 * Every approved rider with their shop link, availability and current load.
 * Availability lives in `rider_profiles`, which RLS hides from staff, so this reads with the
 * service role (server only). Without the key, riders are listed as available.
 */
export async function fetchAssignableRiders(supabase: SupabaseClient): Promise<AssignableRider[]> {
  const db = createAdminClient() ?? supabase;
  const { data: profs } = await db
    .from("profiles")
    .select("id, display_name, restaurant_id")
    .eq("role", "rider")
    .eq("approval_status", "approved")
    .order("display_name");
  const riders = (profs ?? []) as { id: string; display_name: string | null; restaurant_id: number | null }[];
  if (riders.length === 0) return [];

  const ids = riders.map((r) => r.id);
  const [{ data: fleet }, { data: active }] = await Promise.all([
    db.from("rider_profiles").select("user_id, fleet_status").in("user_id", ids),
    db
      .from("orders")
      .select("rider_id")
      .in("rider_id", ids)
      .in("order_status", ["pending", "preparing", "delivering"])
      .neq("delivery_status", "delivered"),
  ]);

  const fleetBy = new Map((fleet ?? []).map((f) => [String(f.user_id), String(f.fleet_status ?? "")]));
  const activeBy = new Map<string, number>();
  for (const o of active ?? []) activeBy.set(String(o.rider_id), (activeBy.get(String(o.rider_id)) ?? 0) + 1);

  return riders.map((r) => {
    const f = fleetBy.get(r.id);
    return {
      id: r.id,
      display_name: r.display_name,
      restaurant_id: r.restaurant_id == null ? null : Number(r.restaurant_id),
      fleet_status: f === "busy" || f === "offline" ? f : "available",
      active: activeBy.get(r.id) ?? 0,
    };
  });
}

/** Riders who can take an order from this shop: linked to it, or to all shops. */
export function ridersForShop(all: AssignableRider[], shopId: number | null | undefined): AssignableRider[] {
  return all.filter((r) => r.restaurant_id === null || r.restaurant_id === Number(shopId));
}
