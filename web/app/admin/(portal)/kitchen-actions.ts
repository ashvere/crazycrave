"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffSession, staffShopId } from "@/lib/staff-session";
import { adjustStock, isLow, shopInventory } from "@/lib/kitchen-ops";

/** Staff member may act on this shop: kitchen accounts only on their own, admins on any. */
async function shopAccess(formData: FormData, back: string) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  const shopId = parseInt(String(formData.get("shop_id") ?? ""), 10);
  const scope = staffShopId(staff);
  if (!Number.isFinite(shopId) || shopId < 1 || (scope !== null && scope !== shopId)) {
    redirect(`${back}?error=invalid`);
  }
  const admin = createAdminClient();
  if (!admin) redirect(`${back}?shop_id=${shopId}&error=config`);
  return { staff, shopId, admin, back: `${back}?shop_id=${shopId}` };
}

const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : NaN;
};
const text = (v: FormDataEntryValue | null, max = 120) => String(v ?? "").trim().slice(0, max);

/* ---------- Inventory ---------- */

export async function addInventoryItem(formData: FormData): Promise<void> {
  const { shopId, admin, back } = await shopAccess(formData, "/admin/inventory");
  const sku = text(formData.get("sku"), 40).toUpperCase();
  const name = text(formData.get("name"));
  if (!sku || !name) redirect(`${back}&error=fields`);
  const { error } = await admin.from("kitchen_inventory").insert({
    shop_id: shopId,
    sku,
    name,
    unit: text(formData.get("unit"), 20) || "pcs",
    qty_on_hand: Math.max(0, num(formData.get("qty_on_hand")) || 0),
    reorder_level: Math.max(0, num(formData.get("reorder_level")) || 0),
    cost_per_unit: Math.max(0, num(formData.get("cost_per_unit")) || 0),
    supplier_name: text(formData.get("supplier_name")) || null,
  });
  if (error) redirect(`${back}&error=${/duplicate|unique/i.test(error.message) ? "sku" : "failed"}`);
  revalidatePath("/admin/inventory");
  redirect(`${back}&done=added`);
}

export async function adjustInventory(formData: FormData): Promise<void> {
  const { staff, shopId, admin, back } = await shopAccess(formData, "/admin/inventory");
  const inventoryId = parseInt(String(formData.get("inventory_id") ?? ""), 10);
  const delta = num(formData.get("delta"));
  if (!Number.isFinite(inventoryId) || !Number.isFinite(delta) || delta === 0) redirect(`${back}&error=fields`);
  const err = await adjustStock(admin, {
    inventoryId,
    shopId,
    delta,
    reason: "adjustment",
    note: text(formData.get("note"), 255) || "Manual adjustment",
    userId: staff.userId,
  });
  if (err) redirect(`${back}&error=failed`);
  revalidatePath("/admin/inventory");
  redirect(`${back}&done=adjusted`);
}

export async function deleteInventoryItem(formData: FormData): Promise<void> {
  const { shopId, admin, back } = await shopAccess(formData, "/admin/inventory");
  const inventoryId = parseInt(String(formData.get("inventory_id") ?? ""), 10);
  const { error } = await admin.from("kitchen_inventory").delete().eq("id", inventoryId).eq("shop_id", shopId);
  if (error) redirect(`${back}&error=failed`);
  revalidatePath("/admin/inventory");
  redirect(`${back}&done=deleted`);
}

/* ---------- Waste ---------- */

export async function logWaste(formData: FormData): Promise<void> {
  const { staff, shopId, admin, back } = await shopAccess(formData, "/admin/waste");
  const inventoryId = parseInt(String(formData.get("inventory_id") ?? ""), 10);
  const qty = num(formData.get("qty"));
  const reason = text(formData.get("reason")) || "Spoilage";
  if (!Number.isFinite(inventoryId) || !(qty > 0)) redirect(`${back}&error=fields`);

  const { data: item } = await admin
    .from("kitchen_inventory")
    .select("cost_per_unit")
    .eq("id", inventoryId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!item) redirect(`${back}&error=invalid`);

  const err = await adjustStock(admin, { inventoryId, shopId, delta: -qty, reason: "waste", note: reason, userId: staff.userId });
  if (err) redirect(`${back}&error=failed`);
  await admin.from("kitchen_waste_logs").insert({
    shop_id: shopId,
    inventory_id: inventoryId,
    qty,
    reason,
    cost_impact: Math.round(qty * Number(item.cost_per_unit) * 100) / 100,
    logged_by: staff.userId,
  });
  revalidatePath("/admin/waste");
  revalidatePath("/admin/inventory");
  redirect(`${back}&done=logged`);
}

/* ---------- Purchase orders ---------- */

export async function generatePurchaseOrder(formData: FormData): Promise<void> {
  const { staff, shopId, admin, back } = await shopAccess(formData, "/admin/purchase-orders");
  const low = (await shopInventory(admin, shopId, false)).filter(isLow).sort((a, b) => a.qty_on_hand - b.qty_on_hand);
  if (low.length === 0) redirect(`${back}&error=none_low`);

  const { count } = await admin
    .from("kitchen_purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);
  const poNumber = `PO-${shopId}-${String((count ?? 0) + 1).padStart(4, "0")}-${Date.now().toString(36).slice(-3).toUpperCase()}`;

  const { data: po, error } = await admin
    .from("kitchen_purchase_orders")
    .insert({
      shop_id: shopId,
      po_number: poNumber,
      supplier_name: low[0].supplier_name || "Supplier",
      status: "draft",
      created_by: staff.userId,
      notes: "Auto-generated from low-stock alerts",
    })
    .select("id")
    .single();
  if (error || !po) redirect(`${back}&error=failed`);

  await admin.from("kitchen_purchase_order_items").insert(
    low.map((i) => ({
      po_id: po.id,
      inventory_id: i.id,
      qty_ordered: Math.max(0, i.reorder_level * 2 - i.qty_on_hand),
      unit_cost: i.cost_per_unit,
    }))
  );
  revalidatePath("/admin/purchase-orders");
  redirect(`${back}&done=created`);
}

export async function setPurchaseOrderStatus(formData: FormData): Promise<void> {
  const { staff, shopId, admin, back } = await shopAccess(formData, "/admin/purchase-orders");
  const poId = parseInt(String(formData.get("po_id") ?? ""), 10);
  const to = String(formData.get("status") ?? "");
  if (!["sent", "received", "cancelled"].includes(to)) redirect(`${back}&error=invalid`);

  const { data: po } = await admin
    .from("kitchen_purchase_orders")
    .select("id, status, po_number")
    .eq("id", poId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!po || po.status === "received" || po.status === "cancelled") redirect(`${back}&error=invalid`);

  if (to === "received") {
    const { data: lines } = await admin
      .from("kitchen_purchase_order_items")
      .select("id, inventory_id, qty_ordered")
      .eq("po_id", poId);
    for (const l of lines ?? []) {
      const err = await adjustStock(admin, {
        inventoryId: Number(l.inventory_id),
        shopId,
        delta: Number(l.qty_ordered),
        reason: "receive",
        note: String(po.po_number),
        userId: staff.userId,
      });
      if (err) redirect(`${back}&error=failed`);
      await admin.from("kitchen_purchase_order_items").update({ qty_received: l.qty_ordered }).eq("id", l.id);
    }
  }
  await admin.from("kitchen_purchase_orders").update({ status: to }).eq("id", poId);
  revalidatePath("/admin/purchase-orders");
  revalidatePath("/admin/inventory");
  redirect(`${back}&done=${to}`);
}

/* ---------- Recipes ---------- */

export type RecipeFormState = { error: string } | null;

export async function saveRecipe(_prev: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "Not signed in." };
  const shopId = parseInt(String(formData.get("shop_id") ?? ""), 10);
  const menuId = parseInt(String(formData.get("menu_id") ?? ""), 10);
  const scope = staffShopId(staff);
  if (!Number.isFinite(shopId) || (scope !== null && scope !== shopId)) return { error: "Not allowed for this shop." };
  const admin = createAdminClient();
  if (!admin) return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };

  const { data: menu } = await admin
    .from("menus")
    .select("id")
    .eq("id", menuId)
    .eq("restaurant_id", shopId)
    .maybeSingle();
  if (!menu) return { error: "Menu item not found." };

  const optInt = (k: string) => {
    const n = parseInt(String(formData.get(k) ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };
  const optNum = (k: string) => {
    const n = num(formData.get(k));
    return Number.isFinite(n) ? n : null;
  };

  const { data: recipe, error } = await admin
    .from("kitchen_recipes")
    .upsert(
      {
        shop_id: shopId,
        menu_id: menuId,
        prep_minutes: Math.max(0, optInt("prep_minutes") ?? 15),
        yield_servings: Math.max(1, optInt("yield_servings") ?? 1),
        steps: String(formData.get("steps") ?? "").trim() || null,
        calories: optInt("calories"),
        allergens: text(formData.get("allergens"), 255) || null,
        protein_g: optNum("protein_g"),
        carbs_g: optNum("carbs_g"),
        fat_g: optNum("fat_g"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "menu_id" }
    )
    .select("id")
    .single();
  if (error || !recipe) return { error: `Could not save the recipe: ${error?.message ?? "unknown error"}` };

  const inv = formData.getAll("ing_inventory_id").map((v) => parseInt(String(v), 10));
  const qtys = formData.getAll("ing_quantity").map((v) => num(v));
  const { data: allowed } = await admin.from("kitchen_inventory").select("id").eq("shop_id", shopId);
  const ok = new Set((allowed ?? []).map((r) => Number(r.id)));
  const rows = inv
    .map((id, i) => ({ recipe_id: recipe.id, inventory_id: id, quantity: qtys[i] }))
    .filter((r) => ok.has(r.inventory_id) && r.quantity > 0);

  await admin.from("kitchen_recipe_ingredients").delete().eq("recipe_id", recipe.id);
  if (rows.length) {
    const { error: ingErr } = await admin.from("kitchen_recipe_ingredients").insert(rows);
    if (ingErr) return { error: `Recipe saved, but ingredients failed: ${ingErr.message}` };
  }
  revalidatePath("/admin/recipes");
  redirect(`/admin/recipes?shop_id=${shopId}&done=saved`);
}
