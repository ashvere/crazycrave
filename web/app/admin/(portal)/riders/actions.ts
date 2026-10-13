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
