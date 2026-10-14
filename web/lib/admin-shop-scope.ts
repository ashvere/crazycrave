import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { staffShopId, type StaffSession } from "@/lib/staff-session";

export type ShopOption = { id: number; name: string };

/**
 * Which shop a per-shop staff page (Menu, KDS, POS) is showing.
 * Kitchen accounts are pinned to their own shop; platform admins pick one,
 * and get `shopId: null` plus the list to choose from until they do.
 */
export async function resolveStaffShop(
  staff: StaffSession,
  rawShopId: string | undefined,
  basePath: string
): Promise<{ shopId: number | null; shop: ShopOption | null; shops: ShopOption[] }> {
  const requested = rawShopId ? parseInt(rawShopId, 10) : NaN;
  const scope = staffShopId(staff);
  if (scope !== null && requested !== scope) redirect(`${basePath}?shop_id=${scope}`);

  const supabase = await createClient();
  const { data } = await supabase.from("restaurants").select("id, name").order("name");
  const shops = (data ?? []).map((s) => ({ id: Number(s.id), name: String(s.name) }));
  const shop = shops.find((s) => s.id === requested) ?? null;
  return { shopId: shop?.id ?? null, shop, shops };
}
