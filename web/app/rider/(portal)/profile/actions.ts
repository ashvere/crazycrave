"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhMobile } from "@/lib/customer-profile";

const VEHICLES = ["motorcycle", "bicycle", "car"] as const;
const FLEET = ["available", "busy", "offline"] as const;

function fail(message: string): never {
  redirect("/rider/profile?error=" + encodeURIComponent(message));
}

export async function riderUpdateProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const vehicle = String(formData.get("vehicle_type") ?? "");
  const plate = String(formData.get("vehicle_plate") ?? "").trim().toUpperCase();
  const fleet = String(formData.get("fleet_status") ?? "");

  if (name === "") fail("Name cannot be empty.");
  if (/\d/.test(name)) fail("Name can't contain numbers.");
  if (name.length > 120) fail("Name is too long (max 120 characters).");
  const phone = phoneRaw === "" ? null : normalizePhMobile(phoneRaw);
  if (phoneRaw !== "" && phone === null) {
    fail("Phone must be an 11-digit mobile number starting with 09 (numbers only).");
  }
  if (!VEHICLES.includes(vehicle as (typeof VEHICLES)[number])) fail("Choose a vehicle type.");
  if (!FLEET.includes(fleet as (typeof FLEET)[number])) fail("Choose your availability.");
  if (plate.length > 12 || (plate !== "" && !/^[A-Z0-9 -]+$/.test(plate))) {
    fail("Plate number can only use letters, numbers, spaces and dashes (max 12).");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const { error: e1 } = await supabase
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (e1) fail(`Could not save your name: ${e1.message}`);

  const { error: e2 } = await supabase.from("rider_profiles").upsert(
    {
      user_id: user.id,
      phone,
      vehicle_type: vehicle,
      vehicle_plate: plate || null,
      fleet_status: fleet,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (e2) fail(`Could not save rider details: ${e2.message}`);

  revalidatePath("/rider", "layout");
  redirect("/rider/profile?saved=1");
}
