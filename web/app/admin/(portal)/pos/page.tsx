import { createClient } from "@/lib/supabase/server";
import { menuImageSrc } from "@/lib/shop-logos";
import { requireStaff } from "@/lib/staff-session";
import { resolveStaffShop } from "@/lib/admin-shop-scope";
import { ShopPicker } from "@/components/admin/shop-picker";
import { PosRegister, type PosMenu } from "@/components/admin/pos-register";

type Search = Promise<{ shop_id?: string }>;

export default async function AdminPosPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const { shopId, shop, shops } = await resolveStaffShop(staff, sp.shop_id, "/admin/pos");

  const head = (
    <header className="staff-page-head">
      <h1 className="staff-page-head__title">Point of sale{shop ? ` — ${shop.name}` : ""}</h1>
      <p className="staff-page-head__sub">Counter sales go straight to the kitchen display.</p>
    </header>
  );

  if (!shopId) {
    return (
      <>
        {head}
        <ShopPicker basePath="/admin/pos" shops={shops} current={null} />
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("menus")
    .select("id, name, price, image, category")
    .eq("restaurant_id", shopId)
    .eq("is_active", true)
    .order("name");
  const menus: PosMenu[] = (data ?? []).map((m) => ({
    id: Number(m.id),
    name: String(m.name),
    price: Number(m.price),
    category: (m.category as string | null) ?? null,
    imageSrc: menuImageSrc(m.image as string | null),
  }));

  return (
    <>
      {head}
      {staff.role === "admin" ? <ShopPicker basePath="/admin/pos" shops={shops} current={shopId} /> : null}
      <PosRegister key={shopId} shopId={shopId} menus={menus} />
    </>
  );
}
