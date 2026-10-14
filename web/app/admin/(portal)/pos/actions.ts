"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffSession, staffShopId } from "@/lib/staff-session";

export type PosLine = { menuId: number; qty: number };
export type PosResult = { ok: true; orderId: number; total: number } | { error: string };

/**
 * Counter sale: a paid pickup order that goes straight to the kitchen (KDS "Cooking").
 * Prices are re-read from `menus`; staff have no INSERT policy on orders, so the
 * service role writes the rows after the shop check.
 */
export async function posCheckout(input: {
  shopId: number;
  lines: PosLine[];
  customerName: string;
  paymentMethod: "cod" | "gcash";
}): Promise<PosResult> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Not signed in." };

  const shopId = Number(input.shopId);
  const scope = staffShopId(staff);
  if (!Number.isFinite(shopId) || shopId < 1) return { error: "Choose a shop first." };
  if (scope !== null && scope !== shopId) return { error: "Not allowed for this shop." };

  const lines = (input.lines ?? [])
    .map((l) => ({ menuId: Math.trunc(Number(l.menuId)), qty: Math.trunc(Number(l.qty)) }))
    .filter((l) => l.menuId > 0 && l.qty > 0 && l.qty <= 99);
  if (lines.length === 0) return { error: "Add at least one item." };

  const paymentMethod = input.paymentMethod === "gcash" ? "gcash" : "cod";
  const customerName = String(input.customerName ?? "").trim().slice(0, 120) || "Walk-in";

  const admin = createAdminClient();
  if (!admin) return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };

  const { data: menus } = await admin
    .from("menus")
    .select("id, name, price, is_active")
    .eq("restaurant_id", shopId)
    .in("id", lines.map((l) => l.menuId));
  const byId = new Map((menus ?? []).map((m) => [Number(m.id), m]));

  const items = [];
  let total = 0;
  for (const l of lines) {
    const m = byId.get(l.menuId);
    if (!m || !m.is_active) return { error: "An item in the cart is no longer available. Refresh and try again." };
    const price = Number(m.price);
    total += price * l.qty;
    items.push({ menu_id: l.menuId, menu_name: String(m.name), price, quantity: l.qty });
  }
  total = Math.round(total * 100) / 100;

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      customer_id: null,
      customer_display_name: customerName,
      shop_id: shopId,
      total,
      payment_method: paymentMethod,
      payment_status: "paid",
      order_status: "preparing",
      delivery_status: "assigned",
      barangay: "Pickup",
      delivery_address: "Pickup — counter sale (POS)",
    })
    .select("id")
    .single();
  if (error || !order) return { error: `Could not save the sale: ${error?.message ?? "unknown error"}` };

  const orderId = Number(order.id);
  const { error: itemsErr } = await admin
    .from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: orderId })));
  if (itemsErr) {
    await admin.from("orders").delete().eq("id", orderId);
    return { error: `Could not save the sale items: ${itemsErr.message}` };
  }

  revalidatePath("/admin/kds");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, orderId, total };
}
