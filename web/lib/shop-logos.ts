import type { SupabaseClient } from "@supabase/supabase-js";
import { encodeMenuImagePath } from "@/lib/cart-cookies";

/** Public bucket for shop logos uploaded from /admin/shops (created on first upload). */
export const LOGO_BUCKET = "shop-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * `restaurants.logo` holds either a legacy filename under public/images/logos
 * (e.g. "ck.png") or the full public URL of an uploaded logo.
 */
export function shopLogoSrc(logo: string | null | undefined): string {
  if (!logo) return "/images/official_logo.png";
  if (/^https?:\/\//i.test(logo)) return logo;
  return `/images/logos/${encodeMenuImagePath(logo)}`;
}

async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { data } = await admin.storage.getBucket(LOGO_BUCKET);
  if (data) return;
  await admin.storage.createBucket(LOGO_BUCKET, {
    public: true,
    fileSizeLimit: LOGO_MAX_BYTES,
    allowedMimeTypes: [...LOGO_TYPES],
  });
}

/** Upload a logo; returns the public URL to store in restaurants.logo. */
export async function uploadShopLogo(
  admin: SupabaseClient,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!LOGO_TYPES.includes(file.type as (typeof LOGO_TYPES)[number])) {
    return { error: "Logo must be a JPG, PNG or WebP image." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: "Logo is too large (max 2 MB)." };
  }
  await ensureBucket(admin);
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Could not upload the logo: ${error.message}` };
  return { url: admin.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl };
}
