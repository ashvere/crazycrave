import Script from "next/script";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  claimRiderOrder,
  fetchOrderItems,
  fetchRiderOrderById,
  fetchRiderProfile,
} from "@/lib/rider-data";
import { RiderTopbar } from "@/components/rider/rider-topbar";
import { RiderDockNav } from "@/components/rider/rider-dock-nav";
import { RiderOrderDetail } from "@/components/rider/rider-order-detail";
import { riderChatUnreadByOrder } from "@/lib/order-messages";
import { proofImageUrl } from "@/lib/delivery-proof";

type Props = { params: Promise<{ id: string }> };

export default async function RiderOrderPage({ params }: Props) {
  const { id: idRaw } = await params;
  const orderId = parseInt(idRaw, 10);
  if (!Number.isFinite(orderId) || orderId < 1) redirect("/rider");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const profile = await fetchRiderProfile(supabase, user.id);
  if (!profile) redirect("/rider/login");

  await claimRiderOrder(supabase, orderId, user.id);
  const order = await fetchRiderOrderById(supabase, orderId);
  if (!order || order.rider_id !== user.id) redirect("/rider");
  order.delivery_proof_url = await proofImageUrl(order.delivery_proof_url);

  const [items, unread] = await Promise.all([
    fetchOrderItems(supabase, orderId),
    riderChatUnreadByOrder(supabase, [orderId]),
  ]);
  const riderName =
    profile.display_name?.trim() || user.email?.split("@")[0] || "Rider";

  return (
    <>
      <RiderTopbar displayName={riderName} />
      <RiderOrderDetail order={order} items={items} chatUnread={unread.get(orderId) ?? 0} />
      <RiderDockNav />
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="lazyOnload"
      />
    </>
  );
}
