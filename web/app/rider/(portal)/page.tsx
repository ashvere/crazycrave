import Script from "next/script";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchRiderOrders, fetchRiderProfile } from "@/lib/rider-data";
import { RiderTopbar } from "@/components/rider/rider-topbar";
import { RiderDockNav } from "@/components/rider/rider-dock-nav";
import { RiderDashboard } from "@/components/rider/rider-dashboard";
import { riderChatUnreadByOrder } from "@/lib/order-messages";
import { proofImageUrl } from "@/lib/delivery-proof";

export default async function RiderHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const profile = await fetchRiderProfile(supabase, user.id);
  if (!profile) redirect("/rider/login");

  const orders = await Promise.all(
    (await fetchRiderOrders(supabase)).map(async (o) =>
      o.delivery_proof_url ? { ...o, delivery_proof_url: await proofImageUrl(o.delivery_proof_url) } : o
    )
  );
  const unread = await riderChatUnreadByOrder(
    supabase,
    orders.filter((o) => o.rider_id === user.id).map((o) => o.id)
  );
  const riderName =
    profile.display_name?.trim() || user.email?.split("@")[0] || "Rider";

  return (
    <>
      <RiderTopbar displayName={riderName} />
      <RiderDashboard orders={orders} riderName={riderName} chatUnread={Object.fromEntries(unread)} />
      <RiderDockNav />
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="lazyOnload"
      />
    </>
  );
}
