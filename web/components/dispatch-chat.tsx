"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markDispatchRead, sendDispatchMessage, type DispatchMessage } from "@/lib/dispatch-chat";

const POLL_MS = 4000;
const MAX_LEN = 1000;

const QUICK: Record<"staff" | "rider", string[]> = {
  staff: ["Please pick up order at the kitchen", "Are you available?", "Customer is waiting", "Thanks!"],
  rider: ["On my way to the kitchen", "Order picked up", "Customer not answering", "Running late, sorry"],
};

const timeFmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const dayFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });

/**
 * One rider's thread with admin/dispatch. Used by the admin Messages page (myRole "staff")
 * and the rider portal (myRole "rider"). Polls every few seconds while visible.
 */
export function DispatchChat({
  riderId,
  myRole,
  title,
  subtitle,
  initial,
}: {
  riderId: string;
  myRole: "staff" | "rider";
  title: string;
  subtitle?: string;
  initial: DispatchMessage[];
}) {
  const [messages, setMessages] = useState<DispatchMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const append = useCallback((rows: DispatchMessage[]) => {
    if (!rows.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...rows.filter((r) => !seen.has(r.id))].sort((a, b) => a.id - b.id);
      lastId.current = next.at(-1)?.id ?? lastId.current;
      return next;
    });
  }, []);

  useEffect(() => {
    void markDispatchRead(riderId);
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase
        .from("rider_staff_messages")
        .select("id, sender_role, body, created_at")
        .eq("rider_id", riderId)
        .gt("id", lastId.current)
        .order("id");
      if (stopped || !data?.length) return;
      append(data as DispatchMessage[]);
      if (data.some((m) => m.sender_role !== myRole)) void markDispatchRead(riderId);
    }
    const t = window.setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [riderId, myRole, supabase, append]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await sendDispatchMessage({ riderId, body });
    setSending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setDraft("");
    append([res.message]);
  }

  let lastDay = "";
  return (
    <section className="dchat" aria-label={`Messages with ${title}`}>
      <header className="dchat__head">
        <span className="dchat__avatar" aria-hidden="true">
          {myRole === "rider" ? <i className="bi bi-headset" /> : title.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="dchat__title">{title}</p>
          {subtitle ? <p className="dchat__sub">{subtitle}</p> : null}
        </div>
      </header>

      <div className="dchat__thread" ref={threadRef} aria-live="polite">
        {messages.length === 0 ? (
          <p className="dchat__empty">
            <i className="bi bi-chat-dots" aria-hidden="true" />
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((m) => {
            const d = dayFmt.format(new Date(m.created_at));
            const showDay = d !== lastDay;
            lastDay = d;
            const mine = m.sender_role === myRole;
            return (
              <div key={m.id}>
                {showDay ? <p className="dchat__day">{d}</p> : null}
                <div className={`dchat__msg${mine ? " dchat__msg--mine" : ""}`}>
                  <p className="dchat__bubble">{m.body}</p>
                  <span className="dchat__time">{timeFmt.format(new Date(m.created_at))}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="dchat__quick">
        {QUICK[myRole].map((q) => (
          <button key={q} type="button" className="dchat__chip" onClick={() => void send(q)} disabled={sending}>
            {q}
          </button>
        ))}
      </div>

      {error ? (
        <p className="dchat__error" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="dchat__compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          className="dchat__input"
          rows={1}
          maxLength={MAX_LEN}
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          aria-label="Message"
        />
        <button type="submit" className="dchat__send" disabled={sending || !draft.trim()} aria-label="Send">
          <i className="bi bi-send-fill" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
