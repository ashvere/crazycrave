"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canRate } from "@/lib/ratings";

function stars(raw: FormDataEntryValue | null): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Save the customer's food + rider rating for a delivered order (once). */
export async function rateOrder(formData: FormData): Promise<{ error: string } | void> {
  const orderId = Number(formData.get("order_id"));
  if (!Number.isFinite(orderId) || orderId < 1) return { error: "Order not found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?login=required&next=/order-track/${orderId}`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, rider_id, order_status, delivery_status, barangay")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!order) return { error: "Order not found." };
  if (!canRate(order)) return { error: "You can rate this order once it's delivered." };

  const food = stars(formData.get("food_rating"));
  if (food === null) return { error: "Tap 1 to 5 stars for the food." };
  const hasRider = Boolean(order.rider_id) && !/pickup/i.test(String(order.barangay ?? ""));
  const rider = hasRider ? stars(formData.get("rider_rating")) : null;
  if (hasRider && rider === null) return { error: "Tap 1 to 5 stars for your rider." };
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);

  const { error } = await supabase.from("order_ratings").insert({
    order_id: orderId,
    customer_id: user.id,
    shop_id: order.shop_id,
    rider_id: order.rider_id ?? null,
    food_rating: food,
    rider_rating: rider,
    comment: comment || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already rated this order." };
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { error: "Ratings aren't switched on yet. Please try again later." };
    }
    return { error: "Couldn't save your rating. Please try again." };
  }

  revalidatePath(`/order-track/${orderId}`);
  revalidatePath("/my-orders");
  revalidatePath("/");
  redirect(`/order-track/${orderId}?rated=1#rate`);
}
