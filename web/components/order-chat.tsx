"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markOrderChatRead } from "@/lib/order-chat";

export type ChatMessage = {
  id: number;
  sender_role: "user" | "rider";
  body: string;
  created_at: string;
};

const POLL_MS = 4000;
const MAX_LEN = 1000;

const QUICK_REPLIES: Record<"user" | "rider", string[]> = {
  user: ["Where are you now?", "Please call when you arrive", "I'll meet you outside", "Thank you!"],
  rider: ["On my way!", "I'm outside now", "Picked up your order", "Running a bit late, sorry"],
};

const timeFmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

export function OrderChat({
  orderId,
  myRole,
  myUserId,
  otherName,
  otherLabel,
  backHref,
  initial,
  closed,
}: {
  orderId: number;
  myRole: "user" | "rider";
  myUserId: string;
  otherName: string;
  otherLabel: string;
  backHref: string;
  initial: ChatMessage[];
  closed: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const supabase = useRef(createClient()).current;

  const scrollToEnd = () => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(scrollToEnd, [messages.length]);

  const append = useCallback((rows: ChatMessage[]) => {
    if (rows.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...rows.filter((r) => !seen.has(r.id))];
      lastId.current = next.at(-1)?.id ?? lastId.current;
      return next;
    });
  }, []);

  // Poll for new messages while the page is visible.
  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase
        .from("order_messages")
        .select("id, sender_role, body, created_at")
        .eq("order_id", orderId)
        .gt("id", lastId.current)
        .order("id", { ascending: true });
      if (stopped || !data?.length) return;
      append(data as ChatMessage[]);
      if (data.some((m) => m.sender_role !== myRole)) void markOrderChatRead(orderId);
    }
    const t = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [append, myRole, orderId, supabase]);

  async function send(text: string) {
    const body = text.trim().slice(0, MAX_LEN);
    if (!body || sending || closed) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("order_messages")
      .insert({ order_id: orderId, sender_user_id: myUserId, sender_role: myRole, body })
      .select("id, sender_role, body, created_at")
      .single();
    setSending(false);
    if (err || !data) {
      setError("Message not sent. Check your connection and try again.");
      return;
    }
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "";
    append([data as ChatMessage]);
  }

  let lastDay = "";

  return (
    <section className="kk-chat" aria-label={`Chat with ${otherName}`}>
      <header className="kk-chat__head">
        <Link href={backHref} className="kk-chat__back" aria-label="Back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </Link>
        <span className="kk-chat__avatar" aria-hidden="true">
          <i className={`bi ${myRole === "user" ? "bi-bicycle" : "bi-person"}`} />
        </span>
        <div className="kk-chat__who">
          <p className="kk-chat__name text-truncate">{otherName}</p>
          <p className="kk-chat__sub">
            {otherLabel} · Order #{orderId}
          </p>
        </div>
      </header>

      <div className="kk-chat__thread" ref={threadRef} aria-live="polite">
        {messages.length === 0 ? (
          <p className="kk-chat__empty">
            No messages yet. {myRole === "user" ? "Share delivery instructions or ask about your order." : "Let the customer know you're on the way."}
          </p>
        ) : (
          messages.map((m) => {
            const when = new Date(m.created_at);
            const day = dayFmt.format(when);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = m.sender_role === myRole;
            return (
              <div key={m.id} style={{ display: "contents" }}>
                {showDay ? <span className="kk-chat__day">{day}</span> : null}
                <div className={`kk-chat__row${mine ? " kk-chat__row--mine" : ""}`}>
                  <div className="kk-chat__bubble">
                    <p className="kk-chat__body">{m.body}</p>
                    <time className="kk-chat__time" dateTime={m.created_at}>
                      {timeFmt.format(when)}
                    </time>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className="kk-chat__composer">
        {error ? <p className="kk-chat__error" role="alert">{error}</p> : null}
        {closed ? (
          <p className="kk-chat__closed">This order is finished — chat is read-only.</p>
        ) : (
          <>
            <div className="kk-chat__quick" aria-label="Quick replies">
              {QUICK_REPLIES[myRole].map((q) => (
                <button key={q} type="button" className="kk-chat__chip" onClick={() => send(q)} disabled={sending}>
                  {q}
                </button>
              ))}
            </div>
            <form
              className="kk-chat__form"
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
            >
              <label className="visually-hidden" htmlFor="kkChatInput">
                Message
              </label>
              <textarea
                id="kkChatInput"
                ref={inputRef}
                className="kk-chat__input"
                rows={1}
                maxLength={MAX_LEN}
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
              />
              <button
                type="submit"
                className="kk-chat__send"
                aria-label="Send message"
                disabled={sending || draft.trim() === ""}
              >
                <i className="bi bi-send-fill" aria-hidden="true" />
              </button>
            </form>
          </>
        )}
      </footer>
    </section>
  );
}
