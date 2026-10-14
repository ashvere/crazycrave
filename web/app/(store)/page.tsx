import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  buildMenuCatalogForPicks,
  loadHomeCatalog,
} from "@/lib/menu-catalog";
import { HomeIndex } from "@/components/store/home-index";
import { CartBar } from "@/components/store/cart-controls";
import { shopRatingSummaries } from "@/lib/ratings";

export default async function StoreHomePage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Crispy Crave</h1>
        <p className="mt-4 text-neutral-600">
          Configure Supabase in <code className="rounded bg-neutral-100 px-1 text-sm">web/.env.local</code> (URL + anon key).
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "";
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    userName = (p?.display_name as string | null) ?? user.email ?? "";
  }

  const { shops, menusByShop } = await loadHomeCatalog(supabase);
  const catalog = await buildMenuCatalogForPicks(supabase);
  const shopRatings = Object.fromEntries(
    await shopRatingSummaries(
      supabase,
      shops.map((s) => s.id)
    )
  );

  const picksConfig = {
    catalog,
    imgBase: "/images/menus/",
    restaurantUrl: "/restaurant",
    loggedIn: !!user,
    defaultLat: 10.7813,
    defaultLon: 122.634,
    defaultPlace: "Pototan area",
  };

  const scheduleMinDate = new Date().toISOString().slice(0, 10);

  return (
    <>
    <HomeIndex
      isLoggedIn={!!user}
      userName={userName}
      shops={shops}
      menusByShop={menusByShop}
      picksConfig={picksConfig}
      scheduleMinDate={scheduleMinDate}
      dataError={shops.length === 0 ? null : null}
      shopRatings={shopRatings}
    />
    <CartBar />
    </>
  );
}
