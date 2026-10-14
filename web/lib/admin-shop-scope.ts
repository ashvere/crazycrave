import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { staffShopId, type StaffSession } from "@/lib/staff-session";

export type ShopOption = { id: number; name: string; logo?: string | null };

/**
 * Which shop a per-shop staff page (Menu, KDS, POS) is showing.
 * Kitchen accounts are pinned to their own shop; platform admins pick one.
 * Without a pick, admins get `shopId: null` (or the first shop with `defaultFirst`).
 */
export async function resolveStaffShop(
  staff: StaffSession,
  rawShopId: string | undefined,
  basePath: string,
  opts: { defaultFirst?: boolean } = {}
): Promise<{ shopId: number | null; shop: ShopOption | null; shops: ShopOption[] }> {
  const requested = rawShopId ? parseInt(rawShopId, 10) : NaN;
  const scope = staffShopId(staff);
  if (scope !== null && requested !== scope) redirect(`${basePath}?shop_id=${scope}`);

  const supabase = await createClient();
  const { data } = await supabase.from("restaurants").select("id, name, logo").order("name");
  const shops = (data ?? []).map((s) => ({ id: Number(s.id), name: String(s.name), logo: (s.logo as string | null) ?? null }));
  const shop = shops.find((s) => s.id === requested) ?? (opts.defaultFirst ? shops[0] ?? null : null);
  return { shopId: shop?.id ?? null, shop, shops };
}
