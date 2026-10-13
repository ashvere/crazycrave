import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Never sign out on a prefetch / client-router fetch (Next prefetches visible links);
  // only a real visit to /logout should end the session.
  const h = request.headers;
  if (
    h.get("next-router-prefetch") ||
    h.get("rsc") ||
    h.get("purpose") === "prefetch" ||
    h.get("sec-purpose")?.includes("prefetch")
  ) {
    return new NextResponse(null, { status: 204 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", request.url));
}
