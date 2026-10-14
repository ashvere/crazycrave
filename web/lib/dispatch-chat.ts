"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Rider <-> admin ("dispatch") messages, table public.rider_staff_messages (migration 20240516000016). */
export type DispatchMessage = {
  id: number;
  sender_role: "staff" | "rider";
  body: string;
  created_at: string;
};

const MAX_LEN = 1000;

/** Who is calling: an admin (may write to any rider's thread) or a rider (own thread only). */
async function caller(): Promise<{ userId: string; role: "admin" | "rider" } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: p } = await admin
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .maybeSingle();
  if (p?.role === "admin") return { userId: user.id, role: "admin" };
  if (p?.role === "rider") return { userId: user.id, role: "rider" };
  return null;
}

export async function sendDispatchMessage(input: {
  riderId?: string;
  body: string;
}): Promise<{ message: DispatchMessage } | { error: string }> {
  const who = await caller();
  if (!who) return { error: "Not signed in." };
  const body = String(input.body ?? "").trim().slice(0, MAX_LEN);
  if (!body) return { error: "Type a message first." };

  const riderId = who.role === "rider" ? who.userId : String(input.riderId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(riderId)) return { error: "Choose a rider." };

  const admin = createAdminClient()!;
  if (who.role === "admin") {
    const { data: r } = await admin.from("profiles").select("role").eq("id", riderId).maybeSingle();
    if (r?.role !== "rider") return { error: "That account is not a rider." };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("rider_staff_messages")
    .insert({
      rider_id: riderId,
      sender_user_id: who.userId,
      sender_role: who.role === "admin" ? "staff" : "rider",
      body,
      // The sender has obviously read their own message.
      ...(who.role === "admin" ? { read_at_staff: now } : { read_at_rider: now }),
    })
    .select("id, sender_role, body, created_at")
    .single();
  if (error || !data) {
    return {
      error: /rider_staff_messages/.test(error?.message ?? "")
        ? "Messaging isn't set up yet (run migration 20240516000016 in Supabase)."
        : "Could not send. Please try again.",
    };
  }
  revalidatePath("/admin/messages");
  return { message: data as DispatchMessage };
}

/** Mark the other side's messages in a thread as read for the caller. */
export async function markDispatchRead(riderId?: string): Promise<void> {
  const who = await caller();
  if (!who) return;
  const thread = who.role === "rider" ? who.userId : String(riderId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(thread)) return;
  const admin = createAdminClient()!;
  const column = who.role === "admin" ? "read_at_staff" : "read_at_rider";
  await admin
    .from("rider_staff_messages")
    .update({ [column]: new Date().toISOString() })
    .eq("rider_id", thread)
    .eq("sender_role", who.role === "admin" ? "rider" : "staff")
    .is(column, null);
}
