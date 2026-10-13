import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markOrderChatRead } from "@/lib/order-chat";
import { isChatClosed } from "@/lib/customer-orders";
import { OrderChat, type ChatMessage } from "@/components/order-chat";
import { legacyCss } from "@/lib/legacy-css";

export default async function OrderChatPage({ params }: { params: Promise<{ id: string }> }) {
  const orderId = parseInt((await params).id, 10);
  if (!Number.isFinite(orderId) || orderId < 1) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?login=required&next=/order-chat/${orderId}`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, rider_id, order_status, delivery_status")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!order) notFound();
  if (!order.rider_id) redirect(`/order-track/${orderId}`);

  const [{ data: messages }, { data: rider }] = await Promise.all([
    supabase
      .from("order_messages")
      .select("id, sender_role, body, created_at")
      .eq("order_id", orderId)
      .order("id", { ascending: true }),
    supabase.from("profiles").select("display_name").eq("id", order.rider_id).maybeSingle(),
  ]);

  await markOrderChatRead(orderId);

  return (
    <main className="kk-chat-page">
      <link rel="stylesheet" href={legacyCss("order-chat.css")} />
      <OrderChat
        orderId={orderId}
        myRole="user"
        myUserId={user.id}
        otherName={(rider?.display_name as string | null)?.trim() || "Your rider"}
        otherLabel="Your rider"
        backHref={`/order-track/${orderId}`}
        initial={(messages ?? []) as ChatMessage[]}
        closed={isChatClosed(order)}
      />
    </main>
  );
}
