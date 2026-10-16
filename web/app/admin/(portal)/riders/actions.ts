"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffSession } from "@/lib/staff-session";

const STATUSES = ["approved", "rejected", "pending"] as const;
type Status = (typeof STATUSES)[number];

/**
 * Approve / reject / reset a rider application. Platform admins only.
 * Uses the service role because `profiles.approval_status` is not writable by signed-in users.
 */
export async function setRiderApproval(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "admin") redirect("/admin");

  const riderId = String(formData.get("rider_id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  const tab = String(formData.get("tab") ?? "pending");
  const shopRaw = String(formData.get("restaurant_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(riderId) || !STATUSES.includes(status)) {
    redirect(`/admin/riders?tab=${tab}&error=invalid`);
  }

  const admin = createAdminClient();
  if (!admin) redirect(`/admin/riders?tab=${tab}&error=config`);

  const update: Record<string, unknown> = {
    approval_status: status,
    updated_at: new Date().toISOString(),
  };
  if (status === "approved") {
    const shopId = parseInt(shopRaw, 10);
    update.restaurant_id = Number.isFinite(shopId) && shopId > 0 ? shopId : null;
  }

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", riderId)
    .eq("role", "rider");
  if (error) redirect(`/admin/riders?tab=${tab}&error=failed`);

  if (status !== "pending") {
    await admin
      .from("rider_documents")
      .update({ status })
      .eq("user_id", riderId)
      .eq("status", "pending");
  }

  revalidatePath("/admin/riders");
  redirect(`/admin/riders?tab=${tab}&done=${status}`);
}

/** Move an approved rider to another shop, or to all shops. Platform admins only. */
export async function setRiderShop(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "admin") redirect("/admin");

  const riderId = String(formData.get("rider_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(riderId)) redirect("/admin/riders?tab=approved&error=invalid");
  const shopId = parseInt(String(formData.get("restaurant_id") ?? ""), 10);

  const admin = createAdminClient();
  if (!admin) redirect("/admin/riders?tab=approved&error=config");

  const { error } = await admin
    .from("profiles")
    .update({
      restaurant_id: Number.isFinite(shopId) && shopId > 0 ? shopId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", riderId)
    .eq("role", "rider")
    .eq("approval_status", "approved");
  if (error) redirect("/admin/riders?tab=approved&error=failed");

  revalidatePath("/admin/riders");
  revalidatePath("/admin/orders");
  redirect("/admin/riders?tab=approved&done=shop");
}

/**
 * Create an approved rider account directly (legacy admin/add-rider.php), skipping /rider/apply.
 */
export async function createRider(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "admin") redirect("/admin");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "").slice(0, 15) || null;
  const vehicleType = String(formData.get("vehicle_type") ?? "motorcycle");
  const plate = String(formData.get("vehicle_plate") ?? "").trim().slice(0, 20) || null;
  const shopId = parseInt(String(formData.get("restaurant_id") ?? ""), 10);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    redirect("/admin/riders?tab=approved&error=rider_fields");
  }
  const admin = createAdminClient();
  if (!admin) redirect("/admin/riders?tab=approved&error=config");

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, signup_role: "rider" },
  });
  if (error || !created.user) {
    redirect(`/admin/riders?tab=approved&error=${/already|registered|exists/i.test(error?.message ?? "") ? "rider_email" : "failed"}`);
  }
  const id = created.user.id;

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      display_name: name,
      role: "rider",
      approval_status: "approved",
      restaurant_id: Number.isFinite(shopId) && shopId > 0 ? shopId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (profErr) redirect("/admin/riders?tab=approved&error=failed");

  await admin.from("rider_profiles").upsert(
    {
      user_id: id,
      phone,
      vehicle_type: ["motorcycle", "bicycle", "car"].includes(vehicleType) ? vehicleType : "motorcycle",
      vehicle_plate: plate,
      fleet_status: "available",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/admin/riders");
  redirect("/admin/riders?tab=approved&done=created");
}
