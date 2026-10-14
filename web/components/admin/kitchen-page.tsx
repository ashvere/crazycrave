import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, type StaffSession } from "@/lib/staff-session";
import { resolveStaffShop, type ShopOption } from "@/lib/admin-shop-scope";
import { KITCHEN_MIGRATION, kitchenReady } from "@/lib/kitchen-ops";
import { ShopPicker } from "@/components/admin/shop-picker";
import type { SupabaseClient } from "@supabase/supabase-js";

const NOTICES: Record<string, { kind: string; text: string }> = {
  added: { kind: "success", text: "Item added." },
  adjusted: { kind: "success", text: "Stock updated." },
  deleted: { kind: "success", text: "Item deleted." },
  logged: { kind: "success", text: "Waste logged and stock deducted." },
  created: { kind: "success", text: "Purchase order created from low-stock items." },
  sent: { kind: "success", text: "Purchase order marked as sent." },
  received: { kind: "success", text: "Purchase order received — stock added." },
  cancelled: { kind: "secondary", text: "Purchase order cancelled." },
  saved: { kind: "success", text: "Recipe saved." },
  none_low: { kind: "secondary", text: "Nothing is low on stock — no purchase order needed." },
  fields: { kind: "warning", text: "Please fill in the required fields." },
  sku: { kind: "warning", text: "That SKU already exists for this shop." },
  invalid: { kind: "warning", text: "That request was not valid." },
  config: { kind: "warning", text: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
  failed: { kind: "danger", text: "Something went wrong. Please try again." },
};

export type KitchenCtx = {
  staff: StaffSession;
  shopId: number;
  shop: ShopOption;
  shops: ShopOption[];
  admin: SupabaseClient;
};

/**
 * Common frame for Inventory / Waste / Purchase orders / Recipes: resolves the shop,
 * checks the kitchen-ops tables exist, shows notices, then renders `children(ctx)`.
 */
export async function KitchenPage({
  title,
  sub,
  basePath,
  search,
  actions,
  children,
}: {
  title: string;
  sub: string;
  basePath: string;
  search: { shop_id?: string; done?: string; error?: string };
  actions?: (ctx: KitchenCtx) => React.ReactNode;
  children: (ctx: KitchenCtx) => Promise<React.ReactNode> | React.ReactNode;
}) {
  const staff = await requireStaff();
  const { shopId, shop, shops } = await resolveStaffShop(staff, search.shop_id, basePath, { defaultFirst: true });
  const notice = NOTICES[search.error ?? search.done ?? ""];
  const admin = createAdminClient();

  const ctx = shopId && shop && admin ? { staff, shopId, shop, shops, admin } : null;
  const ready = admin ? await kitchenReady(admin) : false;

  return (
    <>
      <header className="staff-page-head staff-page-head--row">
        <div>
          <h1 className="staff-page-head__title">
            {title}
            {shop ? ` — ${shop.name}` : ""}
          </h1>
          <p className="staff-page-head__sub">{sub}</p>
        </div>
        {ctx && ready && actions ? actions(ctx) : null}
      </header>
      {staff.role === "admin" ? <ShopPicker basePath={basePath} shops={shops} current={shopId} /> : null}
      {notice ? <div className={`alert alert-${notice.kind}`}>{notice.text}</div> : null}
      {!admin ? (
        <div className="alert alert-warning">Server is missing SUPABASE_SERVICE_ROLE_KEY.</div>
      ) : !ready ? (
        <div className="alert alert-warning">
          Kitchen tables aren&apos;t set up yet. Run <code>supabase/migrations/{KITCHEN_MIGRATION}</code> in the
          Supabase SQL Editor, then reload this page.
        </div>
      ) : ctx ? (
        await children(ctx)
      ) : null}
    </>
  );
}
