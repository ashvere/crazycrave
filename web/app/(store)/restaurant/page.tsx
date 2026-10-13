import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadRestaurantDetail } from "@/lib/menu-catalog";
import { COOKIE_CART, COOKIE_CART_SHOP, parseCartJson } from "@/lib/cart-cookies";
import { RestaurantMenuPage } from "@/components/store/restaurant-menu";

type Props = { searchParams?: Promise<{ id?: string; error?: string; added?: string }> };

export default async function RestaurantPage({ searchParams }: Props) {
  const p = (await searchParams) ?? {};
  const idRaw = p.id ?? "";
  const shopId = parseInt(idRaw, 10);

  if (!idRaw || !Number.isFinite(shopId) || shopId <= 0) {
    redirect("/");
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="section-inner py-5" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className="h3 mb-3">Restaurant menu</h1>
        <p className="text-muted">
          Configure Supabase in <code>web/.env.local</code> to load this menu.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { shop, menus } = await loadRestaurantDetail(supabase, shopId);
  if (!shop) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  const cartShopId = parseInt(cookieStore.get(COOKIE_CART_SHOP)?.value ?? "", 10);
  const hasItems = Object.keys(cart).length > 0;
  const sameShop = hasItems && cartShopId === shopId;

  const cartQty: Record<string, number> = {};
  if (sameShop) {
    for (const [k, line] of Object.entries(cart)) cartQty[k] = Number(line.qty) || 0;
  }

  const addedId = parseInt(p.added ?? "", 10);

  return (
    <RestaurantMenuPage
      shop={shop}
      menus={menus}
      differentShopError={p.error === "different_shop"}
      cartQty={cartQty}
      otherShopInCart={hasItems && !sameShop}
      addedId={Number.isFinite(addedId) ? addedId : null}
    />
  );
}
