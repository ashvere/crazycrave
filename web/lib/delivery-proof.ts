import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Private bucket for delivery proof photos (created on first upload). */
export const PROOF_BUCKET = "delivery-proofs";

/** Stored in orders.delivery_proof_url for uploaded photos; older rows hold plain https URLs. */
const STORED_PREFIX = `${PROOF_BUCKET}/`;

export const PROOF_MAX_BYTES = 4 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { data } = await admin.storage.getBucket(PROOF_BUCKET);
  if (data) return;
  await admin.storage.createBucket(PROOF_BUCKET, {
    public: false,
    fileSizeLimit: PROOF_MAX_BYTES,
    allowedMimeTypes: [...PROOF_TYPES],
  });
}

/** Upload a proof photo for an order; returns the value to store in delivery_proof_url. */
export async function uploadDeliveryProof(
  orderId: number,
  file: File
): Promise<{ stored: string } | { error: string }> {
  if (!PROOF_TYPES.includes(file.type as (typeof PROOF_TYPES)[number])) {
    return { error: "The photo must be a JPG, PNG or WebP image." };
  }
  if (file.size > PROOF_MAX_BYTES) {
    return { error: "That photo is too large (max 4 MB). Try taking it again." };
  }
  const admin = createAdminClient();
  if (!admin) return { error: "Photo upload isn't available right now (server storage key missing)." };

  await ensureBucket(admin);
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Could not upload the photo: ${error.message}` };
  return { stored: `${STORED_PREFIX}${path}` };
}

/** Turn a stored proof value into something an <img> can load (1-hour signed URL for uploads). */
export async function proofImageUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith(STORED_PREFIX)) return stored;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(stored.slice(STORED_PREFIX.length), 60 * 60);
  return data?.signedUrl ?? null;
}
