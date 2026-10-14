"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LIVE_CHANNEL, manilaDay } from "@/lib/site-visits";

function visitorId(): string {
  try {
    let id = localStorage.getItem("kk_vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("kk_vid", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Lets the admin Overview see the storefront: joins a Realtime presence channel
 * (active visitors + the page they're on) and logs one visit per browser per day.
 */
export function VisitorBeacon() {
  const pathname = usePathname() ?? "/";
  const channelRef = useRef<RealtimeChannel | null>(null);
  const joined = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const vid = visitorId();

    const today = manilaDay();
    let logged: string | null = null;
    try {
      logged = localStorage.getItem("kk_visit_day");
    } catch {}
    if (logged !== today) {
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vid }),
        keepalive: true,
      })
        .then((r) => {
          if (!r.ok) return;
          try {
            localStorage.setItem("kk_visit_day", today);
          } catch {}
        })
        .catch(() => {});
    }

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase.channel(LIVE_CHANNEL, { config: { presence: { key: vid } } });
    channelRef.current = channel;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        joined.current = true;
        void channel.track({ path: pathRef.current, at: Date.now() });
      }
    });
    return () => {
      joined.current = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (joined.current) void channelRef.current?.track({ path: pathname, at: Date.now() });
  }, [pathname]);

  return null;
}
