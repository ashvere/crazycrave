"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimRiderOrder } from "@/lib/rider-data";

const DELIVERY_STATUSES = ["assigned", "picked_up", "on_the_way", "delivered"] as const;

function safeRedirect(path: string, fallback: string) {
  if (path.startsWith("/rider")) return path;
  return fallback;
}

export async function riderUpdateDelivery(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const orderId = Number(formData.get("order_id"));
  const status = String(formData.get("delivery_status") ?? "");
  const redirectTo = safeRedirect(
    String(formData.get("redirect") ?? "/rider"),
    "/rider"
  );

  if (
    !Number.isFinite(orderId) ||
    orderId < 1 ||
    !DELIVERY_STATUSES.includes(status as (typeof DELIVERY_STATUSES)[number])
  ) {
    redirect("/rider");
  }

  await claimRiderOrder(supabase, orderId, user.id);

  if (status === "delivered") {
    redirect(`/rider/order/${orderId}/complete`);
  }

  // Once the rider has the food, the order is out for delivery: move the kitchen
  // status along too so staff screens show it (never reopen cancelled/completed).
  const { data: current } = await supabase
    .from("orders")
    .select("order_status")
    .eq("id", orderId)
    .eq("rider_id", user.id)
    .maybeSingle();
  const update: { delivery_status: string; order_status?: string } = { delivery_status: status };
  if (
    (status === "picked_up" || status === "on_the_way") &&
    ["pending", "preparing"].includes(String(current?.order_status ?? ""))
  ) {
    update.order_status = "delivering";
  }

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .eq("rider_id", user.id);

  if (error) {
    console.error("riderUpdateDelivery", error.message);
  }
  revalidatePath("/admin", "layout");

  revalidatePath("/rider");
  revalidatePath(`/rider/order/${orderId}`);
  redirect(redirectTo);
}

export async function riderMarkDelivered(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const orderId = Number(formData.get("order_id"));
  if (!Number.isFinite(orderId) || orderId < 1) redirect("/rider");

  await claimRiderOrder(supabase, orderId, user.id);

  const note = String(formData.get("delivery_proof_note") ?? "").trim();
  const proofUrl = String(formData.get("delivery_proof_url") ?? "").trim();

  const { error } = await supabase
    .from("orders")
    .update({
      delivery_status: "delivered",
      order_status: "completed",
      payment_status: "paid",
      delivery_proof_note: note || null,
      delivery_proof_url: proofUrl || null,
      delivery_proof_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("rider_id", user.id);

  if (error) {
    console.error("riderMarkDelivered", error.message);
  }

  revalidatePath("/rider");
  revalidatePath(`/rider/order/${orderId}`);
  redirect(`/rider/order/${orderId}`);
}
