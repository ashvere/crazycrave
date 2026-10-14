import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReceiptOrder } from "@/lib/receipt";

/**
 * Load an order + items for a receipt with whatever client the caller is allowed to use
 * (RLS decides visibility). `customerId` limits it to that customer's own order.
 */
export async function fetchReceiptOrder(
  supabase: SupabaseClient,
  orderId: number,
  opts: { customerId?: string; shopId?: number | null } = {}
): Promise<ReceiptOrder | null> {
  let q = supabase.from("orders").select("*, restaurants(name)").eq("id", orderId);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.shopId != null) q = q.eq("shop_id", opts.shopId);
  const { data: o } = await q.maybeSingle();
  if (!o) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("menu_name, price, quantity")
    .eq("order_id", orderId)
    .order("id");

  const shop = o.restaurants as { name?: string } | null;
  return {
    id: Number(o.id),
    created_at: String(o.created_at),
    total: Number(o.total),
    rider_fee: Number(o.rider_fee ?? 0),
    payment_method: String(o.payment_method),
    payment_status: String(o.payment_status),
    order_status: String(o.order_status),
    barangay: String(o.barangay ?? ""),
    delivery_address: String(o.delivery_address ?? ""),
    customer_display_name: String(o.customer_display_name ?? "Customer"),
    customer_phone: (o.customer_phone as string | null | undefined) ?? null,
    shopName: shop?.name ?? "Crispy Crave",
    items: (items ?? []).map((i) => ({
      menu_name: String(i.menu_name),
      price: Number(i.price),
      quantity: Number(i.quantity),
    })),
  };
}
