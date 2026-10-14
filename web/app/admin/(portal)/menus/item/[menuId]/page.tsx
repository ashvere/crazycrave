import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, staffShopId } from "@/lib/staff-session";
import { MenuItemEditor } from "@/components/admin/menu-item-editor";

type Params = Promise<{ menuId: string }>;
type Search = Promise<{ shop_id?: string }>;

export default async function AdminEditMenuPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { menuId: raw } = await params;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) notFound();

  const staff = await requireStaff();
  const sp = await searchParams;
  let shopId = sp.shop_id ? parseInt(sp.shop_id, 10) : NaN;
  const scope = staffShopId(staff);
  if (scope !== null) {
    if (Number.isFinite(shopId) && shopId !== scope) {
      redirect(`/admin/menus/item/${id}?shop_id=${scope}`);
    }
    shopId = scope;
  }

  const supabase = await createClient();
  const { data: menu } = await supabase.from("menus").select("*").eq("id", id).maybeSingle();
  if (!menu) notFound();

  const menuRestaurantId = menu.restaurant_id as number;
  if (!Number.isFinite(shopId) || shopId < 1) {
    redirect(`/admin/menus/item/${id}?shop_id=${menuRestaurantId}`);
  }
  if (shopId !== menuRestaurantId) notFound();
  if (scope !== null && scope !== menuRestaurantId) notFound();

  const { data: shop } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", shopId)
    .maybeSingle();

  return (
    <MenuItemEditor
      mode="edit"
      shopId={shopId}
      shopName={(shop?.name as string) ?? "Shop"}
      menu={{
        id: menu.id as number,
        name: menu.name as string,
        description: menu.description as string | null,
        price: Number(menu.price),
        image: menu.image as string | null,
        category: (menu.category as string | null) ?? null,
      }}
    />
  );
}
