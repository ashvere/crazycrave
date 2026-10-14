import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderRating = {
  order_id: number;
  shop_id: number;
  rider_id: string | null;
  food_rating: number;
  rider_rating: number | null;
  comment: string | null;
  created_at: string;
};

export type RatingSummary = { avg: number; count: number };

const COLS = "order_id, shop_id, rider_id, food_rating, rider_rating, comment, created_at";

/** True when the error means the order_ratings migration hasn't been run yet. */
function tableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /order_ratings/.test(error.message ?? "");
}

/** Ratings for these orders; `available` is false until the migration is run (features stay hidden). */
export async function fetchOrderRatings(
  supabase: SupabaseClient,
  orderIds: number[]
): Promise<{ available: boolean; byOrder: Map<number, OrderRating> }> {
  const byOrder = new Map<number, OrderRating>();
  if (orderIds.length === 0) {
    const { error } = await supabase.from("order_ratings").select("order_id").limit(1);
    return { available: !tableMissing(error), byOrder };
  }
  const { data, error } = await supabase.from("order_ratings").select(COLS).in("order_id", orderIds);
  if (error) return { available: !tableMissing(error), byOrder };
  for (const r of (data ?? []) as OrderRating[]) byOrder.set(r.order_id, r);
  return { available: true, byOrder };
}

function summarize(values: number[]): RatingSummary {
  const count = values.length;
  return { avg: count ? values.reduce((a, b) => a + b, 0) / count : 0, count };
}

/** Average food rating per shop. Empty map if the table doesn't exist yet. */
export async function shopRatingSummaries(
  supabase: SupabaseClient,
  shopIds: number[]
): Promise<Map<number, RatingSummary>> {
  const out = new Map<number, RatingSummary>();
  if (shopIds.length === 0) return out;
  const { data, error } = await supabase.from("order_ratings").select("shop_id, food_rating").in("shop_id", shopIds);
  if (error || !data) return out;
  const grouped = new Map<number, number[]>();
  for (const r of data as { shop_id: number; food_rating: number }[]) {
    grouped.set(r.shop_id, [...(grouped.get(r.shop_id) ?? []), r.food_rating]);
  }
  for (const [id, vals] of grouped) out.set(id, summarize(vals));
  return out;
}

/** A rider's average and their most recent rated orders (newest first). */
export async function riderRatings(
  supabase: SupabaseClient,
  riderIds: string[]
): Promise<{ available: boolean; byRider: Map<string, RatingSummary>; recent: OrderRating[] }> {
  const byRider = new Map<string, RatingSummary>();
  if (riderIds.length === 0) return { available: true, byRider, recent: [] };
  const { data, error } = await supabase
    .from("order_ratings")
    .select(COLS)
    .in("rider_id", riderIds)
    .not("rider_rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { available: !tableMissing(error), byRider, recent: [] };
  const rows = (data ?? []) as OrderRating[];
  const grouped = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.rider_id || r.rider_rating == null) continue;
    grouped.set(r.rider_id, [...(grouped.get(r.rider_id) ?? []), r.rider_rating]);
  }
  for (const [id, vals] of grouped) byRider.set(id, summarize(vals));
  return { available: true, byRider, recent: rows };
}

/** Delivered orders can be rated. */
export function canRate(order: { order_status?: string | null; delivery_status?: string | null }): boolean {
  return (
    String(order.delivery_status ?? "").toLowerCase() === "delivered" ||
    String(order.order_status ?? "").toLowerCase() === "completed"
  );
}
