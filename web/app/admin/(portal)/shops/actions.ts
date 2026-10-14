"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { findAuthUserIdByEmail } from "@/lib/supabase/auth-admin";
import { getStaffSession } from "@/lib/staff-session";
import { uploadShopLogo } from "@/lib/shop-logos";

export type ShopFormState = { error: string } | null;

/**
 * Shop CRUD for platform admins. Uses the service role: RLS only lets
 * anon/authenticated users read `restaurants`, never write it.
 */
async function adminOnly() {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "admin") redirect("/admin");
  const admin = createAdminClient();
  if (!admin) return { admin: null, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." } as const;
  return { admin, error: null } as const;
}

function readFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    delivery_time: String(formData.get("delivery_time") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
  };
}

function logoFile(formData: FormData): File | null {
  const f = formData.get("logo");
  return f instanceof File && f.size > 0 ? f : null;
}

function refresh() {
  revalidatePath("/admin/shops");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/restaurant");
}

export async function createShop(_prev: ShopFormState, formData: FormData): Promise<ShopFormState> {
  const { admin, error: cfgErr } = await adminOnly();
  if (!admin) return { error: cfgErr };

  const fields = readFields(formData);
  if (!fields.name) return { error: "Shop name is required." };

  const email = String(formData.get("manager_email") ?? "").trim().toLowerCase();
  const password = String(formData.get("manager_password") ?? "");
  if (email || password) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid manager email." };
    if (password.length < 8) return { error: "Manager password must be at least 8 characters." };
    if (await findAuthUserIdByEmail(email, admin)) {
      return { error: "That manager email is already in use. Try another." };
    }
  }

  let logo: string | null = null;
  const file = logoFile(formData);
  if (file) {
    const up = await uploadShopLogo(admin, file);
    if ("error" in up) return { error: up.error };
    logo = up.url;
  }

  const { data: shop, error } = await admin
    .from("restaurants")
    .insert({ ...fields, logo })
    .select("id")
    .single();
  if (error || !shop) return { error: `Could not create the shop: ${error?.message ?? "unknown error"}` };

  if (email) {
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `${fields.name} Kitchen` },
    });
    if (authErr || !created.user) {
      refresh();
      return { error: `Shop created, but the manager login failed: ${authErr?.message ?? "unknown error"}. Edit the shop to try again.` };
    }
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        display_name: `${fields.name} Kitchen`,
        role: "restaurant",
        approval_status: "approved",
        restaurant_id: shop.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", created.user.id);
    if (profErr) {
      refresh();
      return { error: `Shop created, but linking the manager failed: ${profErr.message}` };
    }
  }

  refresh();
  redirect("/admin/shops?done=created");
}

export async function updateShop(_prev: ShopFormState, formData: FormData): Promise<ShopFormState> {
  const { admin, error: cfgErr } = await adminOnly();
  if (!admin) return { error: cfgErr };

  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isFinite(id) || id < 1) return { error: "Invalid shop." };

  const fields = readFields(formData);
  if (!fields.name) return { error: "Shop name is required." };

  const update: Record<string, unknown> = { ...fields };
  const file = logoFile(formData);
  if (file) {
    const up = await uploadShopLogo(admin, file);
    if ("error" in up) return { error: up.error };
    update.logo = up.url;
  }

  const { error } = await admin.from("restaurants").update(update).eq("id", id);
  if (error) return { error: `Could not save the shop: ${error.message}` };

  refresh();
  redirect("/admin/shops?done=updated");
}

export async function setShopActive(formData: FormData): Promise<void> {
  const { admin } = await adminOnly();
  if (!admin) redirect("/admin/shops?error=config");

  const id = parseInt(String(formData.get("id") ?? ""), 10);
  const active = formData.get("active") === "1";
  if (!Number.isFinite(id) || id < 1) redirect("/admin/shops?error=invalid");

  const { error } = await admin.from("restaurants").update({ is_active: active }).eq("id", id);
  if (error) redirect("/admin/shops?error=failed");

  refresh();
  redirect(`/admin/shops?done=${active ? "activated" : "deactivated"}`);
}

export async function deleteShop(formData: FormData): Promise<void> {
  const { admin } = await adminOnly();
  if (!admin) redirect("/admin/shops?error=config");

  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isFinite(id) || id < 1) redirect("/admin/shops?error=invalid");

  // Orders keep a hard reference to their shop, so a shop with order history
  // can only be hidden, not deleted.
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", id);
  if ((count ?? 0) > 0) redirect("/admin/shops?error=has_orders");

  const { error } = await admin.from("restaurants").delete().eq("id", id);
  if (error) redirect("/admin/shops?error=failed");

  refresh();
  redirect("/admin/shops?done=deleted");
}
