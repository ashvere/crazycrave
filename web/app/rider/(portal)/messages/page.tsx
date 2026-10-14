import { RiderPageShell } from "@/components/rider/rider-page-shell";
import { DispatchChat } from "@/components/dispatch-chat";
import { getRiderContext } from "@/lib/rider-portal";
import { legacyCss } from "@/lib/legacy-css";
import type { DispatchMessage } from "@/lib/dispatch-chat";

/** Rider's thread with admin / dispatch. */
export default async function RiderMessagesPage() {
  const { supabase, user, riderName } = await getRiderContext();
  const { data, error } = await supabase
    .from("rider_staff_messages")
    .select("id, sender_role, body, created_at")
    .eq("rider_id", user.id)
    .order("id")
    .limit(300);

  return (
    <RiderPageShell riderName={riderName} kicker="Chat" title="Dispatch" lede="Message the Crispy Crave admin team.">
      <link rel="stylesheet" href={legacyCss("dispatch-chat.css")} />
      {error ? (
        <div className="alert alert-warning">Chat with dispatch isn&apos;t available yet. Please try again later.</div>
      ) : (
        <DispatchChat
          riderId={user.id}
          myRole="rider"
          title="Crispy Crave dispatch"
          subtitle="Admin team"
          initial={(data as DispatchMessage[] | null) ?? []}
        />
      )}
    </RiderPageShell>
  );
}
