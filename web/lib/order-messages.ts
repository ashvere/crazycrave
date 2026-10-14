import type { SupabaseClient } from "@supabase/supabase-js";

/** Unread customer messages per order for the logged-in rider. */
export async function riderChatUnreadByOrder(
  supabase: SupabaseClient,
  orderIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (orderIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("order_messages")
    .select("order_id")
    .in("order_id", orderIds)
    .eq("sender_role", "user")
    .is("read_at_rider", null);

  if (error || !data) return counts;

  for (const row of data) {
    const id = row.order_id as number;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Unread rider messages per order for the logged-in customer. */
export async function customerChatUnreadByOrder(
  supabase: SupabaseClient,
  orderIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (orderIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("order_messages")
    .select("order_id")
    .in("order_id", orderIds)
    .eq("sender_role", "rider")
    .is("read_at_customer", null);

  if (error || !data) return counts;

  for (const row of data) {
    const id = row.order_id as number;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
