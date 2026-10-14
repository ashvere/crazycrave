import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VISITS_BUCKET, manilaDay } from "@/lib/site-visits";

/**
 * Records one storefront visit per browser per day (for the admin Overview's
 * visitors-today and conversion estimate). Idempotent: re-posting the same id
 * the same day overwrites the same empty object.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { vid?: unknown } | null;
  const vid = typeof body?.vid === "string" ? body.vid : "";
  if (!/^[0-9a-f-]{36}$/i.test(vid)) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const path = `${manilaDay()}/${vid.toLowerCase()}`;
  let { error } = await admin.storage
    .from(VISITS_BUCKET)
    .upload(path, new Blob([""]), { upsert: true, contentType: "text/plain" });
  if (error && /not found/i.test(error.message)) {
    await admin.storage.createBucket(VISITS_BUCKET, { public: false });
    ({ error } = await admin.storage
      .from(VISITS_BUCKET)
      .upload(path, new Blob([""]), { upsert: true, contentType: "text/plain" }));
  }
  return NextResponse.json({ ok: !error });
}
