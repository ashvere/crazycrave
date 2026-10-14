"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIVE_CHANNEL } from "@/lib/site-visits";

type Presence = { path?: string };

function pageLabel(path: string): string {
  if (path === "/") return "Home";
  if (path.startsWith("/restaurant")) return "Shop menu";
  if (path.startsWith("/cart")) return "Cart";
  if (path.startsWith("/checkout")) return "Checkout";
  if (path.startsWith("/my-orders") || path.startsWith("/order-track")) return "Tracking orders";
  if (path.startsWith("/profile")) return "Profile";
  return path;
}

/** Live view: storefront visitors right now (Supabase Realtime presence), by page. */
export function LiveVisitors() {
  const [byPage, setByPage] = useState<Map<string, number> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setFailed(true);
      return;
    }
    // Watch only: no presence key tracked, so the admin isn't counted as a visitor.
    const channel = supabase.channel(LIVE_CHANNEL);
    const sync = () => {
      const state = channel.presenceState<Presence>();
      const counts = new Map<string, number>();
      for (const metas of Object.values(state)) {
        const label = pageLabel(metas[metas.length - 1]?.path ?? "/");
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      setByPage(counts);
    };
    channel.on("presence", { event: "sync" }, sync).subscribe((status) => {
      if (status === "SUBSCRIBED") sync();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setFailed(true);
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const total = byPage ? Array.from(byPage.values()).reduce((a, b) => a + b, 0) : null;
  const funnel = byPage
    ? Array.from(byPage.entries()).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div>
      <p className="staff-stats-hero__label d-flex align-items-center gap-2 mb-1">
        <span
          className="d-inline-block rounded-circle"
          style={{ width: 8, height: 8, background: failed ? "var(--staff-muted)" : "#16a34a" }}
          aria-hidden="true"
        />
        Active visitors
      </p>
      <p className="staff-stats-hero__value tabular-nums mb-1" aria-live="polite">
        {failed ? "—" : total ?? "…"}
      </p>
      {failed ? (
        <p className="staff-stats-hero__hint">Live view unavailable (Realtime not reachable).</p>
      ) : funnel.length === 0 ? (
        <p className="staff-stats-hero__hint">No one on the storefront right now.</p>
      ) : (
        <ul className="list-unstyled small mb-0">
          {funnel.map(([label, n]) => (
            <li key={label} className="d-flex justify-content-between">
              <span className="text-muted">{label}</span>
              <span className="tabular-nums fw-semibold">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
