const MAX_SIDE = 1600;
const QUALITY = 0.8;

/**
 * Shrink a phone photo to ≤1600px JPEG in the browser before uploading. Keeps
 * uploads fast on mobile data and under Vercel's ~4.5 MB request limit.
 * Non-images (PDF) and formats the browser can't decode (some HEIC) pass through.
 */
export async function shrinkImage(file: File, name = "photo.jpg"): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
