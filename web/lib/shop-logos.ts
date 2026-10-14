import type { SupabaseClient } from "@supabase/supabase-js";
import { encodeMenuImagePath } from "@/lib/cart-cookies";

/** Public buckets for images uploaded from the staff portal (created on first upload). */
export const LOGO_BUCKET = "shop-logos";
export const MENU_IMAGE_BUCKET = "menu-images";
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const isUrl = (v: string) => /^https?:\/\//i.test(v);

/**
 * `restaurants.logo` holds either a legacy filename under public/images/logos
 * (e.g. "ck.png") or the full public URL of an uploaded logo.
 */
export function shopLogoSrc(logo: string | null | undefined): string {
  if (!logo) return "/images/official_logo.png";
  if (isUrl(logo)) return logo;
  return `/images/logos/${encodeMenuImagePath(logo)}`;
}

/** Same idea for `menus.image`: legacy path under public/images/menus, or an uploaded URL. */
export function menuImageSrc(image: string | null | undefined): string {
  if (!image) return "/images/menus/default.png";
  if (isUrl(image)) return image;
  return `/images/menus/${encodeMenuImagePath(image)}`;
}

/** Upload an image to a public bucket; returns its public URL. */
export async function uploadPublicImage(
  admin: SupabaseClient,
  bucket: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    return { error: "Image must be a JPG, PNG or WebP file." };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { error: "Image is too large (max 2 MB)." };
  }
  const { data: existing } = await admin.storage.getBucket(bucket);
  if (!existing) {
    await admin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: IMAGE_MAX_BYTES,
      allowedMimeTypes: [...IMAGE_TYPES],
    });
  }
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Could not upload the image: ${error.message}` };
  return { url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export function uploadShopLogo(admin: SupabaseClient, file: File) {
  return uploadPublicImage(admin, LOGO_BUCKET, file);
}
