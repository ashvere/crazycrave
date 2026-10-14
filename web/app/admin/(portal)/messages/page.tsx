import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";
import { legacyCss } from "@/lib/legacy-css";
import { DispatchChat } from "@/components/dispatch-chat";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import type { DispatchMessage } from "@/lib/dispatch-chat";

type Search = Promise<{ rider?: string }>;

const when = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    ...(sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }),
  });
};

/** Admin inbox for rider <-> dispatch messages. */
export default async function AdminMessagesPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");
  const selected = String((await searchParams).rider ?? "");

  const admin = createAdminClient();
  if (!admin) return <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to use messages.</div>;

  const [{ data: riders }, { data: msgs, error }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, approval_status")
      .eq("role", "rider")
      .neq("approval_status", "rejected")
      .order("display_name"),
    admin
      .from("rider_staff_messages")
      .select("id, rider_id, sender_role, body, created_at, read_at_staff")
      .order("id", { ascending: false })
      .limit(1000),
  ]);

  const head = (
    <header className="staff-page-head">
      <h1 className="staff-page-head__title">Messages</h1>
      <p className="staff-page-head__sub">Chat with riders — they see this under Chat in the rider app.</p>
    </header>
  );

  if (error) {
    return (
      <>
        {head}
        <div className="alert alert-warning">
          Messaging isn&apos;t set up yet. Run <code>supabase/migrations/20240516000016_rider_staff_messages.sql</code> in
          the Supabase SQL Editor, then reload.
        </div>
      </>
    );
  }

  const last = new Map<string, { body: string; created_at: string; mine: boolean }>();
  const unread = new Map<string, number>();
  for (const m of msgs ?? []) {
    const rid = String(m.rider_id);
    if (!last.has(rid)) last.set(rid, { body: String(m.body), created_at: String(m.created_at), mine: m.sender_role === "staff" });
    if (m.sender_role === "rider" && !m.read_at_staff) unread.set(rid, (unread.get(rid) ?? 0) + 1);
  }
  const list = (riders ?? [])
    .map((r) => ({
      id: String(r.id),
      name: String(r.display_name ?? "").trim() || "Rider",
      pending: r.approval_status === "pending",
      last: last.get(String(r.id)) ?? null,
      unread: unread.get(String(r.id)) ?? 0,
    }))
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "") || a.name.localeCompare(b.name));

  const current = list.find((r) => r.id === selected) ?? null;
  let thread: DispatchMessage[] = [];
  if (current) {
    const { data } = await admin
      .from("rider_staff_messages")
      .select("id, sender_role, body, created_at")
      .eq("rider_id", current.id)
      .order("id")
      .limit(300);
    thread = (data as DispatchMessage[] | null) ?? [];
  }

  return (
    <>
      <link rel="stylesheet" href={legacyCss("dispatch-chat.css")} />
      {/* Keeps the inbox list (unread counts, previews) fresh; the open thread polls on its own. */}
      <AutoRefresh seconds={15} />
      {head}
      <div className={`dinbox${current ? " dinbox--open" : ""}`}>
        <aside className="dinbox__list" aria-label="Riders">
          {list.length === 0 ? (
            <p className="dinbox__empty">No riders yet.</p>
          ) : (
            list.map((r) => (
              <Link
                key={r.id}
                href={`/admin/messages?rider=${r.id}`}
                className={`dinbox__item${r.id === current?.id ? " is-active" : ""}`}
                aria-current={r.id === current?.id ? "page" : undefined}
              >
                <span className="dinbox__avatar" aria-hidden="true">
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="dinbox__text">
                  <span className="dinbox__name">
                    {r.name}
                    {r.pending ? <span className="dinbox__tag">Pending</span> : null}
                  </span>
                  <span className="dinbox__preview">
                    {r.last ? `${r.last.mine ? "You: " : ""}${r.last.body}` : "No messages yet"}
                  </span>
                </span>
                <span className="dinbox__meta">
                  {r.last ? <span className="dinbox__when">{when(r.last.created_at)}</span> : null}
                  {r.unread ? <span className="dinbox__badge">{r.unread}</span> : null}
                </span>
              </Link>
            ))
          )}
        </aside>
        <div className="dinbox__pane">
          {current ? (
            <>
              <Link href="/admin/messages" className="dinbox__back">
                <i className="bi bi-arrow-left" aria-hidden="true" /> All riders
              </Link>
              <DispatchChat
                key={current.id}
                riderId={current.id}
                myRole="staff"
                title={current.name}
                subtitle={current.pending ? "Application pending" : "Rider"}
                initial={thread}
              />
            </>
          ) : (
            <div className="dinbox__placeholder">
              <i className="bi bi-chat-square-text" aria-hidden="true" />
              <p>Choose a rider to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
