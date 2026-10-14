"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV: { key: string; label: string; href: string; icon: string }[] = [
  { key: "deliveries", label: "Deliveries", href: "/rider", icon: "bi-truck" },
  { key: "earnings", label: "Earnings", href: "/rider/earnings", icon: "bi-wallet2" },
  { key: "performance", label: "Stats", href: "/rider/performance", icon: "bi-bar-chart" },
  { key: "tracking", label: "GPS", href: "/rider/tracking", icon: "bi-geo-alt" },
  { key: "notifications", label: "Alerts", href: "/rider/notifications", icon: "bi-bell" },
  { key: "profile", label: "Profile", href: "/rider/profile", icon: "bi-person" },
];

const POLL_MS = 8000;
const TOASTED_KEY = "kk-rider-last-toasted-msg";

type Unread = { id: number; order_id: number; body: string };

function readToasted(): number {
  try {
    return Number(window.sessionStorage.getItem(TOASTED_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeToasted(id: number) {
  try {
    window.sessionStorage.setItem(TOASTED_KEY, String(id));
  } catch {
    // Storage blocked: the same message may pop up again after a reload.
  }
}

/**
 * Watches for unread customer messages on this rider's orders: badge on Alerts,
 * "(n)" in the tab title, and a pop-up with Reply for each new message.
 */
function useCustomerMessages(pathname: string | null) {
  const [unread, setUnread] = useState<Unread[]>([]);
  const [toast, setToast] = useState<Unread | null>(null);
  const supabase = useRef(createClient()).current;
  const riderId = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      if (!riderId.current) {
        const { data } = await supabase.auth.getUser();
        riderId.current = data.user?.id ?? null;
        if (!riderId.current) return;
      }
      const { data, error } = await supabase
        .from("order_messages")
        .select("id, order_id, body, orders!inner(rider_id)")
        .eq("sender_role", "user")
        .is("read_at_rider", null)
        .eq("orders.rider_id", riderId.current)
        .order("id", { ascending: false })
        .limit(50);
      if (stopped || error || !data) return;
      const rows = (data as unknown as Unread[]).map(({ id, order_id, body }) => ({ id, order_id, body }));
      setUnread(rows);

      const newest = rows[0];
      if (newest && newest.id > readToasted()) {
        writeToasted(newest.id);
        // Already looking at that chat: it marks itself read, no pop-up needed.
        if (pathname !== `/rider/order/${newest.order_id}/chat`) {
          setToast(newest);
          if ("vibrate" in navigator) navigator.vibrate?.(200);
        }
      }
    }

    void poll();
    const t = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [pathname, supabase]);

  // "(2) Crispy Crave" while messages are waiting.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = unread.length > 0 ? `(${unread.length}) ${base}` : base;
  }, [unread.length, pathname]);

  return { unread, toast, dismiss: () => setToast(null) };
}

export function RiderDockNav() {
  const pathname = usePathname();
  const { unread, toast, dismiss } = useCustomerMessages(pathname);

  return (
    <>
      {toast ? (
        <div className="rider-toast" role="status" aria-live="polite">
          <span className="rider-toast__icon" aria-hidden="true">
            <i className="bi bi-chat-dots-fill" />
          </span>
          <Link href={`/rider/order/${toast.order_id}/chat`} className="rider-toast__body" onClick={dismiss}>
            <span className="rider-toast__title">New message · Order #{toast.order_id}</span>
            <span className="rider-toast__text">{toast.body}</span>
          </Link>
          <Link href={`/rider/order/${toast.order_id}/chat`} className="rider-toast__reply" onClick={dismiss}>
            Reply
          </Link>
          <button type="button" className="rider-toast__close" aria-label="Dismiss" onClick={dismiss}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <nav className="rider-portal-nav" aria-label="Rider portal">
        <div className="rider-portal-nav__dock">
          {NAV.map((item) => {
            const active =
              item.href === "/rider"
                ? pathname === "/rider" || Boolean(pathname?.startsWith("/rider/order"))
                : pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
            const badge = item.key === "notifications" ? unread.length : 0;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rider-portal-nav__link${active ? " rider-portal-nav__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
                title={item.label}
                aria-label={badge > 0 ? `${item.label}, ${badge} unread` : undefined}
              >
                <span className="rider-portal-nav__icon-wrap">
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  {badge > 0 ? (
                    <span className="rider-portal-nav__badge" aria-hidden="true">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="rider-portal-nav__label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
