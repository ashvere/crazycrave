import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCustomerOrders } from "@/lib/customer-orders-fetch";
import { customerChatUnreadByOrder } from "@/lib/order-messages";
import { MyOrdersView } from "@/components/store/my-orders-view";
import { CancelOrderModal } from "@/components/store/cancel-order-modal";
import { canRate, fetchOrderRatings } from "@/lib/ratings";
import type { CustomerOrderWithMeta } from "@/components/store/my-orders-view";

export const dynamic = "force-dynamic";

type Search = Promise<{
  cancelled?: string;
  cancel_error?: string;
}>;

export default async function MyOrdersPage({ searchParams }: { searchParams: Search }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required&next=/my-orders");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as string | undefined;
  if (role === "admin" || role === "restaurant") redirect("/admin");
  if (role === "rider") redirect("/rider");

  const { orders: rawOrders, loadError, usedAdminFallback } = await fetchCustomerOrders(user.id);

  const orderIds = rawOrders.map((o) => o.id);
  let unreadMap = new Map<number, number>();
  try {
    unreadMap = await customerChatUnreadByOrder(supabase, orderIds);
  } catch {
    unreadMap = new Map();
  }

  const { available: ratingsOn, byOrder: ratings } = await fetchOrderRatings(
    supabase,
    rawOrders.filter(canRate).map((o) => o.id)
  );

  const orders: CustomerOrderWithMeta[] = rawOrders.map((o) => ({
    ...o,
    chatUnread: o.rider_id ? (unreadMap.get(o.id) ?? 0) : 0,
    rateable: ratingsOn && canRate(o),
    myFoodRating: ratings.get(o.id)?.food_rating ?? null,
  }));

  const sp = await searchParams;
  let flash: { kind: "success" | "warning"; message: string } | null = null;
  if (sp.cancelled === "1") {
    flash = { kind: "success", message: "Your order has been cancelled." };
  } else if (sp.cancel_error === "not_allowed") {
    flash = { kind: "warning", message: "That order can no longer be cancelled." };
  } else if (sp.cancel_error === "note") {
    flash = { kind: "warning", message: "Please add a note when you select Other." };
  } else if (sp.cancel_error) {
    flash = { kind: "warning", message: "Could not cancel. Please try again." };
  }

  if (loadError) {
    flash = {
      kind: "warning",
      message:
        "Could not load orders with your account permissions. Run supabase/fix-customer-orders-policies-only.sql in the SQL Editor (role: postgres).",
    };
  } else if (usedAdminFallback && rawOrders.length > 0) {
    flash = {
      kind: "warning",
      message:
        "Orders loaded via server key — add customer RLS policies in Supabase (fix-customer-orders-policies-only.sql) for normal access.",
    };
  }

  return (
    <>
      <MyOrdersView orders={orders} flash={flash} />
      <CancelOrderModal />
    </>
  );
}
