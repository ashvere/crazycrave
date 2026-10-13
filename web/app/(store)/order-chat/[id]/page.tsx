import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markOrderChatRead } from "@/lib/order-chat";
import { isChatClosed } from "@/lib/customer-orders";
import { OrderChat, type ChatMessage } from "@/components/order-chat";

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

  // Customers can't read rider_profiles directly; only expose the assigned rider's number.
  const admin = createAdminClient();
  const { data: riderProfile } = admin
    ? await admin.from("rider_profiles").select("phone").eq("user_id", order.rider_id).maybeSingle()
    : { data: null };

  await markOrderChatRead(orderId);

  return (
    <main className="kk-chat-page">
      <link rel="stylesheet" href="/legacy/css/order-chat.css" />
      <OrderChat
        orderId={orderId}
        myRole="user"
        myUserId={user.id}
        otherName={(rider?.display_name as string | null)?.trim() || "Your rider"}
        otherLabel="Your rider"
        otherPhone={(riderProfile?.phone as string | null) ?? null}
        backHref={`/order-track/${orderId}`}
        initial={(messages ?? []) as ChatMessage[]}
        closed={isChatClosed(order)}
      />
    </main>
  );
}
