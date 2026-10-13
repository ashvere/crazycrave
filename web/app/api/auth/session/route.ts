import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Does the server see a signed-in user for this browser's cookies? Used right after
 * login, and handy to open directly when a page says "log in" unexpectedly: it lists
 * which auth/cart cookies arrived (names and sizes only, never values).
 */
export async function GET() {
  let loggedIn = false;
  let user: { id: string; email: string | null } | null = null;
  let authError: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    loggedIn = !!data.user;
    if (data.user) user = { id: data.user.id, email: data.user.email ?? null };
    if (error && error.name !== "AuthSessionMissingError") authError = error.message;
  }

  const cookieStore = await cookies();
  const received = cookieStore
    .getAll()
    .filter((c) => c.name.startsWith("sb-") || c.name.startsWith("kk_"))
    .map((c) => ({ name: c.name, size: c.value.length }));

  return NextResponse.json(
    { loggedIn, user, authError, cookies: received },
    { headers: { "Cache-Control": "no-store" } }
  );
}
