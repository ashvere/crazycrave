import type { SupabaseClient } from "@supabase/supabase-js";

/** Shown when supabase/migrations/20240516000015_kitchen_ops.sql hasn't been run yet. */
export const KITCHEN_MIGRATION = "20240516000015_kitchen_ops.sql";

export type InventoryItem = {
  id: number;
  shop_id: number;
  sku: string;
  name: string;
  unit: string;
  qty_on_hand: number;
  reorder_level: number;
  cost_per_unit: number;
  supplier_name: string | null;
};

const DEFAULT_STOCK: [string, string, string, number, number, number][] = [
  ["CHK-RAW", "Chicken (raw)", "kg", 50, 10, 180],
  ["OIL-FRY", "Frying oil", "L", 20, 5, 85],
  ["RICE", "Rice", "kg", 30, 8, 45],
  ["WRAP", "Wrapper / box", "pcs", 200, 50, 2],
  ["SAUCE", "Dipping sauce", "L", 10, 3, 120],
];

/** False until the kitchen-ops migration exists in the database. */
export async function kitchenReady(admin: SupabaseClient): Promise<boolean> {
  // Not a head/count request: those come back without an error when the table is missing.
  const { error } = await admin.from("kitchen_inventory").select("id").limit(1);
  return !error;
}

/** Inventory for a shop, seeding the legacy starter items the first time (kk_kitchen_seed_inventory_if_empty). */
export async function shopInventory(admin: SupabaseClient, shopId: number, seed = true): Promise<InventoryItem[]> {
  const load = async () =>
    ((await admin.from("kitchen_inventory").select("*").eq("shop_id", shopId).order("name")).data ?? []).map(
      (r) =>
        ({
          ...r,
          id: Number(r.id),
          shop_id: Number(r.shop_id),
          qty_on_hand: Number(r.qty_on_hand),
          reorder_level: Number(r.reorder_level),
          cost_per_unit: Number(r.cost_per_unit),
        }) as InventoryItem
    );
  let items = await load();
  if (items.length === 0 && seed) {
    await admin.from("kitchen_inventory").insert(
      DEFAULT_STOCK.map(([sku, name, unit, qty, reorder, cost]) => ({
        shop_id: shopId,
        sku,
        name,
        unit,
        qty_on_hand: qty,
        reorder_level: reorder,
        cost_per_unit: cost,
        supplier_name: "Local supplier",
      }))
    );
    items = await load();
  }
  return items;
}

export function isLow(i: InventoryItem): boolean {
  return i.reorder_level > 0 && i.qty_on_hand <= i.reorder_level;
}

export async function adjustStock(
  admin: SupabaseClient,
  args: {
    inventoryId: number;
    shopId: number;
    delta: number;
    reason: "adjustment" | "waste" | "receive" | "sale" | "recipe_deduct";
    note?: string | null;
    orderId?: number | null;
    userId?: string | null;
  }
): Promise<string | null> {
  const { error } = await admin.rpc("kitchen_adjust_stock", {
    p_inventory_id: args.inventoryId,
    p_shop_id: args.shopId,
    p_delta: args.delta,
    p_reason: args.reason,
    p_order_id: args.orderId ?? null,
    p_note: args.note ?? null,
    p_user_id: args.userId ?? null,
  });
  return error?.message ?? null;
}

export const qtyFmt = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 3 });
export const pesoFmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
