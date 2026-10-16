"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COOKIE_CART,
  COOKIE_CART_SHOP,
  COOKIE_CHECKOUT_PREFILL,
  parseCartJson,
} from "@/lib/cart-cookies";
import {
  BARANGAY_DISTANCES,
  PRIORITY_SURCHARGE,
  STORE_PICKUP_BARANGAY,
  isDeliveryOption,
  normalizePhPhone,
  riderFeeFor,
  roundMoney,
} from "@/lib/checkout";

function fail(code: string): never {
  redirect(`/checkout?error=${code}`);
}

/**
 * Port of PHP `place-order.php`. Prices, fees and totals are recomputed here from the
 * database and barangay table — nothing from the browser is trusted. Inserts use the
 * service-role client because customers have no INSERT policy on `orders`.
 */
export async function placeOrder(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  const cookieStore = await cookies();
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  const lines = Object.values(cart).filter((l) => Number(l.qty) > 0);
  const shopId = parseInt(cookieStore.get(COOKIE_CART_SHOP)?.value ?? "", 10);
  if (lines.length === 0 || !Number.isFinite(shopId) || shopId < 1) redirect("/cart");

  const admin = createAdminClient();
  if (!admin) fail("config");

  /* FORM INPUTS */
  const fulfillment = String(formData.get("fulfillment") ?? "") === "pickup" ? "pickup" : "delivery";
  let barangay = String(formData.get("barangay") ?? "").trim();
  let deliveryAddress = String(formData.get("delivery_address") ?? "").trim();
  let pickupTime = String(formData.get("pickup_time") ?? "").trim();
  const orderNotes = String(formData.get("order_notes") ?? "").trim().slice(0, 500);
  const optRaw = String(formData.get("delivery_option") ?? "standard");
  const deliveryOption = isDeliveryOption(optRaw) ? optRaw : "standard";

  const phone = normalizePhPhone(String(formData.get("customer_phone") ?? ""));
  if (!phone) fail("phone");
  if (fulfillment === "delivery" && deliveryAddress === "") fail("address");
  if (fulfillment === "pickup") {
    barangay = STORE_PICKUP_BARANGAY;
    if (deliveryAddress === "") deliveryAddress = "In-store pickup";
  }
  deliveryAddress = deliveryAddress.slice(0, 500);

  if (!/^\d{2}:\d{2}/.test(pickupTime)) pickupTime = "12:00:00";
  else if (/^\d{2}:\d{2}$/.test(pickupTime)) pickupTime += ":00";

  /* VALIDATE BARANGAY + RIDER FEE */
  if (!Object.prototype.hasOwnProperty.call(BARANGAY_DISTANCES, barangay)) fail("location");
  const distanceKm = fulfillment === "pickup" ? 0 : BARANGAY_DISTANCES[barangay]!;
  const riderFee = fulfillment === "pickup" ? 0 : riderFeeFor(distanceKm, deliveryOption);

  /* RE-PRICE CART FROM THE DATABASE */
  const menuIds = lines.map((l) => Number(l.menu_id));
  const { data: menus, error: menuErr } = await admin
    .from("menus")
    .select("id, restaurant_id, name, price, is_active, restaurants!inner(is_active)")
    .in("id", menuIds);
  if (menuErr) fail("failed");

  const menuById = new Map((menus ?? []).map((m) => [Number(m.id), m]));
  const items: { menu_id: number; menu_name: string; price: number; quantity: number }[] = [];
  for (const line of lines) {
    const m = menuById.get(Number(line.menu_id));
    const shopActive = (m?.restaurants as unknown as { is_active: boolean } | null)?.is_active;
    if (!m || !m.is_active || !shopActive || Number(m.restaurant_id) !== shopId) fail("items");
    items.push({
      menu_id: Number(m.id),
      menu_name: String(m.name ?? ""),
      price: Number(m.price),
      quantity: Math.min(Math.max(Math.floor(Number(line.qty)), 1), 99),
    });
  }

  const foodTotal = roundMoney(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const total = roundMoney(foodTotal + riderFee);

  /* PAYMENT + ADDRESS NOTES (same text conventions as PHP so staff screens read alike) */
  // Cash on delivery is the only payment method offered.
  const paymentMethod = "cod";
  if (orderNotes !== "") deliveryAddress += `\n\nCustomer notes: ${orderNotes}`;

  if (fulfillment === "pickup") {
    deliveryAddress = `${deliveryAddress}\n\nFulfillment: Store pickup`.trim();
  } else if (deliveryOption === "priority") {
    deliveryAddress += `\n\nDelivery option: Priority (+₱${PRIORITY_SURCHARGE} rider fee)`;
  } else if (deliveryOption === "scheduled") {
    const date = String(formData.get("schedule_date") ?? "").trim();
    const time = String(formData.get("schedule_time") ?? "").trim().slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) fail("schedule");
    if (Number.isNaN(new Date(`${date}T${time}:00`).getTime())) fail("schedule");
    deliveryAddress += `\n\nScheduled delivery: ${date} at ${time}`;
    pickupTime = `${time}:00`;
  }

  const paymentStatus = "pending";

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName =
    String(profile?.display_name ?? "").trim() || user.email?.split("@")[0] || "Customer";

  /* INSERT ORDER */
  const orderRow = {
    customer_id: user.id,
    customer_display_name: displayName.slice(0, 120),
    shop_id: shopId,
    total,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    order_status: "pending",
    delivery_status: "assigned",
    barangay,
    delivery_address: deliveryAddress,
    distance_km: distanceKm,
    rider_fee: riderFee,
    pickup_time: pickupTime,
    customer_phone: phone,
  };
  let { data: order, error: orderErr } = await admin.from("orders").insert(orderRow).select("id").single();
  if (orderErr && /customer_phone/.test(orderErr.message)) {
    // Database not migrated yet (20240516000013): keep orders flowing, phone goes in the address notes.
    const { customer_phone: _omit, ...legacyRow } = orderRow;
    void _omit;
    ({ data: order, error: orderErr } = await admin
      .from("orders")
      .insert({ ...legacyRow, delivery_address: `${deliveryAddress}\n\nContact: ${phone}` })
      .select("id")
      .single());
  }
  if (orderErr || !order) fail("failed");
  const orderId = Number(order.id);

  /* INSERT ORDER ITEMS (roll back the order if this fails) */
  const { error: itemsErr } = await admin
    .from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: orderId })));
  if (itemsErr) {
    await admin.from("orders").delete().eq("id", orderId);
    fail("failed");
  }

  /* Auto-assign delivery orders to an available rider (unassigned orders stay in the rider pool) */
  if (fulfillment === "delivery") {
    await autoAssignRider(admin, orderId, shopId).catch(() => null);
  }

  /* Remember the number for next time (only if the profile has none yet). */
  const { data: cp } = await supabase
    .from("customer_profiles")
    .select("phone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cp?.phone) {
    await supabase.from("customer_profiles").upsert({ user_id: user.id, phone }, { onConflict: "user_id" });
  }

  /* CLEAR CART */
  cookieStore.delete(COOKIE_CART);
  cookieStore.delete(COOKIE_CART_SHOP);
  cookieStore.delete(COOKIE_CHECKOUT_PREFILL);

  revalidatePath("/my-orders");
  revalidatePath("/admin");
  redirect(`/order-track/${orderId}?placed=1`);
}

/** Port of PHP `kk_auto_assign_rider`: approved rider for this shop (or any shop) with fewest active deliveries. */
async function autoAssignRider(admin: SupabaseClient, orderId: number, shopId: number) {
  const { data: riders } = await admin
    .from("profiles")
    .select("id, restaurant_id")
    .eq("role", "rider")
    .eq("approval_status", "approved")
    .or(`restaurant_id.eq.${shopId},restaurant_id.is.null`);
  if (!riders?.length) return;

  const ids = riders.map((r) => String(r.id));
  const { data: active } = await admin
    .from("orders")
    .select("rider_id")
    .in("rider_id", ids)
    .neq("delivery_status", "delivered")
    .neq("order_status", "cancelled");

  const load = new Map(ids.map((id) => [id, 0]));
  for (const o of active ?? []) {
    const id = String(o.rider_id);
    load.set(id, (load.get(id) ?? 0) + 1);
  }
  const [riderId] = [...load.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]!;

  await admin
    .from("orders")
    .update({ rider_id: riderId, delivery_status: "assigned" })
    .eq("id", orderId)
    .is("rider_id", null);
}
