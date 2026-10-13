import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Does the server see a signed-in user for this browser's cookies? Used right after login. */
export async function GET() {
  let loggedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = !!user;
  }
  return NextResponse.json({ loggedIn }, { headers: { "Cache-Control": "no-store" } });
}
