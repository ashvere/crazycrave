"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { fetchProfileRole } from "@/lib/supabase/profile-role";
import { getStaffSession, staffShopId, type StaffSession } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MENU_IMAGE_BUCKET, uploadPublicImage } from "@/lib/shop-logos";

export type StaffSignInResult = { error: string } | { ok: true };

/** Staff login on the server so session cookies exist before the profile role check. */
export async function staffSignIn(formData: FormData): Promise<StaffSignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const cfg = getSupabasePublicConfig();
  const projectHint = cfg?.url ? ` (Database: ${new URL(cfg.url).hostname})` : "";

  const supabase = await createClient();
  let authData: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"];
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      const msg = res.error.message;
      if (msg.includes("path") && msg.includes("URL")) {
        return {
          error: `${msg} — Check NEXT_PUBLIC_SUPABASE_URL in Vercel (and .env.local): use only https://YOUR_REF.supabase.co with no /auth or /rest path.`,
        };
      }
      if (/invalid login credentials/i.test(msg)) {
        const spaces =
          password !== password.trim()
            ? " Your password starts or ends with a space — check for a stray space from copy/paste."
            : "";
        return { error: `Wrong email or password for ${email}.${spaces}${projectHint}` };
      }
      if (/email not confirmed/i.test(msg)) {
        return {
          error: `${email} hasn't confirmed its email yet. Confirm it in Supabase → Authentication → Users.${projectHint}`,
        };
      }
      return { error: `Sign-in failed: ${msg}${projectHint}` };
    }
    authData = res.data;
  } catch (e) {
    return {
      error: `Could not reach the login service: ${e instanceof Error ? e.message : String(e)}${projectHint}`,
    };
  }

  const user = authData.user;
  if (!user) {
    return { error: "Could not load session after sign-in." };
  }

  const { role, error: profileErr } = await fetchProfileRole(
    user.id,
    authData.session?.access_token
  );

  if (profileErr) {
    await supabase.auth.signOut();
    const keyHint = /api key|jwt|apikey/i.test(profileErr)
      ? " Check SUPABASE_SERVICE_ROLE_KEY in Vercel — it must belong to the same Supabase project as NEXT_PUBLIC_SUPABASE_URL."
      : "";
    return { error: `Signed in, but could not load your profile: ${profileErr}.${keyHint}${projectHint}` };
  }

  if (role !== "admin" && role !== "restaurant") {
    await supabase.auth.signOut();
    if (!role) {
      return {
        error:
          `No profile row for ${email} (user id ${user.id}).` +
          ` In Supabase → Authentication → Users, open this email and confirm a matching row exists in Table Editor → profiles with the same id and role admin or restaurant.` +
          projectHint,
      };
    }
    return {
      error:
        `Signed in as ${email}, but role is "${role}" (need admin or restaurant).` +
        ` Update profiles for user id ${user.id}, or sign in with admin@crispy.com if you use the demo admin.` +
        projectHint,
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function adminAssignRider(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  if (!staff) return;

  const orderId = parseInt(String(formData.get("order_id") ?? ""), 10);
  const riderRaw = String(formData.get("rider_id") ?? "").trim();
  if (!Number.isFinite(orderId) || orderId < 1) {
    return;
  }

  const shopScope = staffShopId(staff);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;
  if (shopScope !== null && order.shop_id !== shopScope) {
    return;
  }

  const riderId = riderRaw === "" ? null : riderRaw;

  const { error } = await supabase.from("orders").update({ rider_id: riderId }).eq("id", orderId);

  if (error) {
    console.error("adminAssignRider", error.message);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

export async function adminUpdateOrderStatus(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  if (!staff) return;

  const orderId = parseInt(String(formData.get("order_id") ?? ""), 10);
  const order_status = String(formData.get("order_status") ?? "").trim();
  const allowed = ["pending", "preparing", "delivering", "completed", "cancelled"];
  if (!Number.isFinite(orderId) || orderId < 1 || !allowed.includes(order_status)) {
    return;
  }

  const shopScope = staffShopId(staff);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;
  if (shopScope !== null && order.shop_id !== shopScope) {
    return;
  }

  const { error } = await supabase.from("orders").update({ order_status }).eq("id", orderId);
  if (error) {
    console.error("adminUpdateOrderStatus", error.message);
    return;
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

function assertMenuShop(staff: StaffSession | null, shopId: number): string | null {
  if (!staff) return "Not signed in";
  if (!Number.isFinite(shopId) || shopId < 1) return "Invalid shop";
  const scope = staffShopId(staff);
  if (scope !== null && scope !== shopId) return "Not allowed for this shop";
  return null;
}

/** Uploaded photo wins over the typed legacy path; neither keeps `fallback`. */
async function menuImageFromForm(
  formData: FormData,
  fallback: string | null
): Promise<{ image: string | null } | { error: string }> {
  const file = formData.get("image_file");
  if (file instanceof File && file.size > 0) {
    const admin = createAdminClient();
    if (!admin) return { error: "Image upload needs SUPABASE_SERVICE_ROLE_KEY on the server." };
    const up = await uploadPublicImage(admin, MENU_IMAGE_BUCKET, file);
    return "error" in up ? up : { image: up.url };
  }
  const typed = String(formData.get("image") ?? "").trim();
  return { image: typed || fallback };
}

export async function createMenuItem(formData: FormData) {
  const staff = await getStaffSession();
  const shopId = parseInt(String(formData.get("shop_id") ?? ""), 10);
  const denied = assertMenuShop(staff, shopId);
  if (denied) return { error: denied };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim().slice(0, 80) || null;
  const priceRaw = String(formData.get("price") ?? "").trim();
  const img = await menuImageFromForm(formData, null);
  if ("error" in img) return { error: img.error };
  const image = img.image;
  const price = parseFloat(priceRaw);

  if (name.length < 1 || !Number.isFinite(price)) {
    return { error: "Name and valid price required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("menus").insert({
    restaurant_id: shopId,
    name,
    description,
    price,
    image,
    category,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/menus");
  return { ok: true as const, shopId };
}

export async function updateMenuItem(formData: FormData) {
  const staff = await getStaffSession();
  if (!staff) return { error: "Not signed in" };

  const menuId = parseInt(String(formData.get("menu_id") ?? ""), 10);
  const shopId = parseInt(String(formData.get("shop_id") ?? ""), 10);
  if (!Number.isFinite(menuId) || menuId < 1) {
    return { error: "Invalid menu" };
  }

  const denied = assertMenuShop(staff, shopId);
  if (denied) return { error: denied };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = parseFloat(String(formData.get("price") ?? ""));
  const category = String(formData.get("category") ?? "").trim().slice(0, 80) || null;
  if (name.length < 1 || !Number.isFinite(price)) {
    return { error: "Invalid fields" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("menus")
    .select("id, restaurant_id, image")
    .eq("id", menuId)
    .maybeSingle();
  if (!existing || existing.restaurant_id !== shopId) {
    return { error: "Menu not found" };
  }

  const img = await menuImageFromForm(formData, null);
  if ("error" in img) return { error: img.error };
  const image = img.image;

  const { error } = await supabase
    .from("menus")
    .update({ name, description, price, image, category })
    .eq("id", menuId);

  if (error) return { error: error.message };
  revalidatePath("/admin/menus");
  return { ok: true as const, shopId };
}

/** Turn a menu item on/off for customers (legacy toggle-menu.php). */
export async function toggleMenuItem(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  const menuId = parseInt(String(formData.get("menu_id") ?? ""), 10);
  const shopId = parseInt(String(formData.get("shop_id") ?? ""), 10);
  if (assertMenuShop(staff, shopId) || !Number.isFinite(menuId)) return;

  const supabase = await createClient();
  const { data: m } = await supabase
    .from("menus")
    .select("is_active")
    .eq("id", menuId)
    .eq("restaurant_id", shopId)
    .maybeSingle();
  if (!m) return;
  await supabase.from("menus").update({ is_active: !m.is_active }).eq("id", menuId);
  revalidatePath("/admin/menus");
  revalidatePath("/");
  revalidatePath("/restaurant");
}

/**
 * Delete a menu item (legacy delete-menu.php). Items already on past orders are
 * referenced by order_items, so those are switched off instead of deleted.
 */
export async function deleteMenuItem(formData: FormData): Promise<void> {
  const staff = await getStaffSession();
  const menuId = parseInt(String(formData.get("menu_id") ?? ""), 10);
  const shopId = parseInt(String(formData.get("shop_id") ?? ""), 10);
  if (assertMenuShop(staff, shopId) || !Number.isFinite(menuId)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("menus").delete().eq("id", menuId).eq("restaurant_id", shopId);
  if (error) {
    await supabase.from("menus").update({ is_active: false }).eq("id", menuId).eq("restaurant_id", shopId);
    revalidatePath("/admin/menus");
    redirect(`/admin/menus?shop_id=${shopId}&notice=kept`);
  }
  revalidatePath("/admin/menus");
  revalidatePath("/");
  revalidatePath("/restaurant");
  redirect(`/admin/menus?shop_id=${shopId}&notice=deleted`);
}
