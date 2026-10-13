/**
 * URL for a stylesheet in public/legacy/css with a per-deploy version, so a new
 * deploy's styles reach browsers whose cache (or service worker) holds the old file.
 */
export function legacyCss(file: string): string {
  return `/legacy/css/${file}?v=${process.env.NEXT_PUBLIC_ASSET_VERSION ?? "dev"}`;
}
