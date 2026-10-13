"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ChatRole = "user" | "rider";

/**
 * Mark the other side's messages as read for the signed-in customer or rider.
 * Signed-in users can't UPDATE order_messages under RLS, so this verifies access
 * and then writes with the service role.
 */
export async function markOrderChatRead(orderId: number): Promise<void> {
  if (!Number.isFinite(orderId) || orderId < 1) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: order } = await supabase
    .from("orders")
    .select("customer_id, rider_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const role: ChatRole | null =
    order.customer_id === user.id ? "user" : order.rider_id === user.id ? "rider" : null;
  if (!role) return;

  const admin = createAdminClient();
  if (!admin) return;
  const column = role === "user" ? "read_at_customer" : "read_at_rider";
  await admin
    .from("order_messages")
    .update({ [column]: new Date().toISOString() })
    .eq("order_id", orderId)
    .neq("sender_role", role)
    .is(column, null);
}
