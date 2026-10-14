"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { posCheckout } from "@/app/admin/(portal)/pos/actions";

export type PosMenu = {
  id: number;
  name: string;
  price: number;
  category: string | null;
  imageSrc: string;
};

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "exact", "0", "back", "00", "clear"] as const;

/** Counter register (legacy admin/pos.php layout): menu grid, current sale, cash keypad. */
export function PosRegister({
  shopId,
  shopName,
  menus,
  shopSwitcher,
}: {
  shopId: number;
  shopName: string;
  menus: PosMenu[];
  /** Rendered under the header (admins switching shops). */
  shopSwitcher?: React.ReactNode;
}) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState<"cod" | "gcash">("cod");
  const [cash, setCash] = useState(""); // digits typed on the keypad, in pesos
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: number; total: number; change: number | null } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    document.body.classList.add("pos-page");
    return () => document.body.classList.remove("pos-page", "pos-fullscreen");
  }, []);
  useEffect(() => {
    document.body.classList.toggle("pos-fullscreen", fullscreen);
  }, [fullscreen]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(menus.map((m) => m.category?.trim()).filter(Boolean) as string[]))],
    [menus]
  );
  const q = search.trim().toLowerCase();
  const shown = menus.filter(
    (m) => (category === "All" || m.category?.trim() === category) && (!q || m.name.toLowerCase().includes(q))
  );
  const lines = menus.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const tendered = cash ? parseInt(cash, 10) : 0;
  const change = payment === "cod" && cash ? tendered - total : null;
  const short = change !== null && change < 0;

  function add(id: number, delta: number) {
    setError(null);
    setDone(null);
    setCart((c) => {
      const qty = Math.max(0, Math.min(99, (c[id] ?? 0) + delta));
      const next = { ...c };
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function key(k: (typeof KEYS)[number]) {
    setCash((v) => {
      if (k === "clear") return "";
      if (k === "back") return v.slice(0, -1);
      if (k === "exact") return String(Math.ceil(total));
      const next = (v + k).replace(/^0+/, "");
      return next.length > 7 ? v : next;
    });
  }

  function toggleFullscreen() {
    const on = !fullscreen;
    setFullscreen(on);
    try {
      if (on) void document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) void document.exitFullscreen();
    } catch {}
  }

  function checkout() {
    startTransition(async () => {
      const res = await posCheckout({
        shopId,
        lines: lines.map((l) => ({ menuId: l.id, qty: l.qty })),
        customerName: customer,
        paymentMethod: payment,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDone({ orderId: res.orderId, total: res.total, change });
      setCart({});
      setCustomer("");
      setCash("");
    });
  }

  return (
    <>
      <header className="pos-head">
        <div className="pos-head__text">
          <h1 className="pos-head__title">Point of sale</h1>
          <p className="pos-head__sub">{shopName} · syncs to kitchen display</p>
        </div>
        <div className="pos-head__actions">
          <button
            type="button"
            className="pos-head__btn"
            onClick={toggleFullscreen}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            aria-pressed={fullscreen}
          >
            <i className={`bi ${fullscreen ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"}`} aria-hidden="true" />
          </button>
          <Link href={`/admin/kds?shop_id=${shopId}`} className="pos-head__link">
            <i className="bi bi-display" aria-hidden="true" />
            <span>KDS</span>
          </Link>
        </div>
      </header>

      {shopSwitcher}

      <div className="pos-layout">
        <section className="pos-menu" aria-label="Menu items">
          <div className="pos-menu__toolbar">
            <h2 className="pos-menu__title">Menu</h2>
            <span className="pos-menu__count">{shown.length} items</span>
          </div>

          <div className="pos-search-wrap">
            <i className="bi bi-search pos-search-wrap__icon" aria-hidden="true" />
            <input
              type="search"
              className="pos-search-wrap__input"
              placeholder="Search menu…"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search menu"
            />
          </div>

          {categories.length > 1 ? (
            <div className="pos-categories" role="tablist" aria-label="Categories">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={c === category}
                  className={`pos-cat-btn${c === category ? " is-active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}

          {menus.length === 0 ? (
            <p className="pos-empty">
              No active menu items. Add items under <Link href={`/admin/menus?shop_id=${shopId}`}>Menu</Link>.
            </p>
          ) : shown.length === 0 ? (
            <p className="pos-no-results">No items match your search.</p>
          ) : (
            <div className="pos-menu-grid">
              {shown.map((m) => (
                <div key={m.id} className="pos-menu-item">
                  <button
                    type="button"
                    className={`pos-menu-item__btn pos-menu-item__btn--photo${cart[m.id] ? " is-in-cart" : ""}`}
                    onClick={() => add(m.id, 1)}
                  >
                    {cart[m.id] ? <span className="pos-menu-item__badge">{cart[m.id]}</span> : null}
                    <img src={m.imageSrc} alt="" className="pos-menu-item__img" loading="lazy" />
                    <span className="pos-menu-item__meta">
                      <span className="pos-menu-item__name">{m.name}</span>
                      <span className="pos-menu-item__price">{peso(m.price)}</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="pos-sale" id="pos-sale" aria-label="Current sale">
          <header className="pos-sale__head">
            <h2 className="pos-sale__title">Current sale</h2>
            {count > 0 ? (
              <span className="pos-sale__count">
                {count} {count === 1 ? "item" : "items"}
              </span>
            ) : null}
          </header>

          <div className="pos-sale__body">
            {done ? (
              <div className="pos-success" role="status">
                <strong>Order #{done.orderId} sent to the kitchen.</strong>
                <br />
                {peso(done.total)} paid
                {done.change !== null && done.change > 0 ? ` · change ${peso(done.change)}` : ""}.{" "}
                <a href={`/admin/orders/${done.orderId}/receipt`} target="_blank" rel="noopener noreferrer">
                  Print receipt
                </a>
              </div>
            ) : null}
            {error ? (
              <p className="pos-alert" role="alert">
                {error}
              </p>
            ) : null}

            {lines.length === 0 ? (
              <div className="pos-sale__empty">
                <i className="bi bi-basket" aria-hidden="true" />
                <p>Tap a menu item to start a sale.</p>
              </div>
            ) : (
              <>
                <ul className="pos-sale__lines">
                  {lines.map((l) => (
                    <li key={l.id} className="pos-sale__line">
                      <div className="pos-sale__line-main">
                        <span className="pos-sale__qty">{l.qty}</span>
                        <span className="pos-sale__name">{l.name}</span>
                        <span className="pos-sale__amount">{peso(l.price * l.qty)}</span>
                      </div>
                      <div className="pos-sale__line-actions">
                        <button type="button" className="pos-sale__qty-btn" onClick={() => add(l.id, -1)} aria-label={`One less ${l.name}`}>
                          −
                        </button>
                        <button type="button" className="pos-sale__qty-btn" onClick={() => add(l.id, 1)} aria-label={`One more ${l.name}`}>
                          +
                        </button>
                        <button type="button" className="pos-sale__remove" onClick={() => add(l.id, -l.qty)} aria-label={`Remove ${l.name}`}>
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="pos-sale__total">
                  <span>Total</span>
                  <strong>{peso(total)}</strong>
                </div>

                <div className="pos-sale__checkout">
                  <label className="pos-field">
                    <span className="pos-field__label">Customer name</span>
                    <input
                      className="pos-field__input"
                      placeholder="Walk-in"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    />
                  </label>

                  <div className="pos-field">
                    <span className="pos-field__label">Payment</span>
                    <div className="pos-pay-toggle" role="group" aria-label="Payment method">
                      <button type="button" className={payment === "cod" ? "is-active" : ""} onClick={() => setPayment("cod")}>
                        <i className="bi bi-cash me-1" aria-hidden="true" /> Cash
                      </button>
                      <button type="button" className={payment === "gcash" ? "is-active" : ""} onClick={() => setPayment("gcash")}>
                        <i className="bi bi-phone me-1" aria-hidden="true" /> GCash
                      </button>
                    </div>
                  </div>

                  {payment === "cod" ? (
                    <div className="pos-cash-panel">
                      <p className="pos-cash-panel__label">Cash received</p>
                      <div className="pos-cash-panel__display tabular-nums">{peso(tendered)}</div>
                      <div className="pos-cash-panel__change">
                        <span>{short ? "Short" : "Change"}</span>
                        <strong className={short ? "text-danger" : undefined}>
                          {change === null ? peso(0) : peso(Math.abs(change))}
                        </strong>
                      </div>
                      <div className="pos-keypad" role="group" aria-label="Cash keypad">
                        {KEYS.map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`pos-key${["exact", "back", "clear"].includes(k) ? " pos-key--action" : ""}${k === "00" ? " pos-key--wide" : ""}`}
                            onClick={() => key(k)}
                            aria-label={k === "back" ? "Backspace" : undefined}
                          >
                            {k === "exact" ? "Exact" : k === "back" ? "⌫" : k === "clear" ? "Clear" : k}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="pos-sale__submit"
                    disabled={pending || short}
                    onClick={checkout}
                  >
                    {pending ? "Saving…" : short ? "Cash doesn't cover total" : `Complete sale · ${peso(total)}`}
                  </button>
                </div>

                <div className="pos-sale__clear-form">
                  <button type="button" className="pos-sale__clear" onClick={() => setCart({})}>
                    Clear cart
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {count > 0 ? (
        <a href="#pos-sale" className="pos-mobile-bar">
          <span>
            <i className="bi bi-basket me-2" aria-hidden="true" />
            View sale · {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="tabular-nums">{peso(total)}</span>
        </a>
      ) : null}
    </>
  );
}
