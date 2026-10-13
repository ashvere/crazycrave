import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchRiderOrderById, fetchRiderProfile } from "@/lib/rider-data";
import { markOrderChatRead } from "@/lib/order-chat";
import { isChatClosed } from "@/lib/customer-orders";
import { RiderTopbar } from "@/components/rider/rider-topbar";
import { RiderDockNav } from "@/components/rider/rider-dock-nav";
import { OrderChat, type ChatMessage } from "@/components/order-chat";
import { legacyCss } from "@/lib/legacy-css";

export default async function RiderOrderChatPage({ params }: { params: Promise<{ id: string }> }) {
  const orderId = parseInt((await params).id, 10);
  if (!Number.isFinite(orderId) || orderId < 1) redirect("/rider");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const profile = await fetchRiderProfile(supabase, user.id);
  if (!profile) redirect("/rider/login");

  const order = await fetchRiderOrderById(supabase, orderId);
  if (!order || order.rider_id !== user.id) redirect("/rider");

  const { data: messages } = await supabase
    .from("order_messages")
    .select("id, sender_role, body, created_at")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  await markOrderChatRead(orderId);

  const riderName = profile.display_name?.trim() || user.email?.split("@")[0] || "Rider";

  return (
    <>
      <RiderTopbar displayName={riderName} />
      <main className="kk-chat-page kk-chat-page--rider">
        <link rel="stylesheet" href={legacyCss("order-chat.css")} />
        <OrderChat
          orderId={orderId}
          myRole="rider"
          myUserId={user.id}
          otherName={order.customer_display_name || "Customer"}
          otherLabel="Customer"
          backHref={`/rider/order/${orderId}`}
          initial={(messages ?? []) as ChatMessage[]}
          closed={isChatClosed(order)}
        />
      </main>
      <RiderDockNav />
    </>
  );
}
