"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffShopId } from "@/lib/staff-session";

/** Kitchen ticket flow: pending → preparing → delivering (ready / out) → completed, or cancelled. */
const NEXT: Record<string, string[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["delivering", "cancelled"],
  delivering: ["completed"],
};

export async function kdsSetStatus(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  if (!staff) return;

  const orderId = parseInt(String(formData.get("order_id") ?? ""), 10);
  const to = String(formData.get("to") ?? "");
  if (!Number.isFinite(orderId) || orderId < 1) return;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const scope = staffShopId(staff);
  if (scope !== null && order.shop_id !== scope) return;
  if (!(NEXT[String(order.order_status)] ?? []).includes(to)) return;

  const { error } = await supabase.from("orders").update({ order_status: to }).eq("id", orderId);
  if (error) console.error("kdsSetStatus", error.message);

  revalidatePath("/admin/kds");
  revalidatePath("/admin/orders");
}
