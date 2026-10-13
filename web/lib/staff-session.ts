import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchStaffProfile } from "@/lib/supabase/profile-role";

export type StaffSession = {
  userId: string;
  email: string | null;
  displayName: string;
  role: "admin" | "restaurant";
  restaurantId: number | null;
};

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let profile = (await fetchStaffProfile(user.id)).profile;

  if (!profile) {
    const { data: role } = await supabase.rpc("auth_profile_role");
    const { data: restaurantId } = await supabase.rpc("auth_profile_restaurant_id");
    const roleStr = role as string | null;
    if (roleStr === "admin" || roleStr === "restaurant") {
      const { data: row } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      profile = {
        display_name: (row?.display_name as string | null) ?? null,
        role: roleStr,
        restaurant_id: (restaurantId as number | null) ?? null,
      };
    }
  }

  if (!profile) return null;

  const role = profile.role as string;
  if (role !== "admin" && role !== "restaurant") return null;

  const restaurantId = profile.restaurant_id as number | null;
  const displayName =
    (profile.display_name as string | null)?.trim() || user.email?.split("@")[0] || "Staff";

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName,
    role: role as "admin" | "restaurant",
    restaurantId: typeof restaurantId === "number" && Number.isFinite(restaurantId)
      ? restaurantId
      : null,
  };
});

export async function requireStaff(): Promise<StaffSession> {
  const s = await getStaffSession();
  if (!s) {
    // Tell the login page why: no session cookie reached the server, or a session
    // exists but its profile isn't admin/restaurant (or couldn't be read).
    let reason = "session";
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) reason = "role";
    }
    redirect(`/admin/login?required=1&reason=${reason}`);
  }
  return s;
}

/** Shop scope for restaurant managers; null = platform (all shops). */
export function staffShopId(staff: StaffSession): number | null {
  if (staff.role === "admin") return null;
  return staff.restaurantId;
}
