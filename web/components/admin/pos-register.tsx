"use client";

import { useMemo, useState, useTransition } from "react";
import { posCheckout } from "@/app/admin/(portal)/pos/actions";

export type PosMenu = {
  id: number;
  name: string;
  price: number;
  category: string | null;
  imageSrc: string;
};

const peso = (n: number) => `₱${n.toFixed(2)}`;

export function PosRegister({ shopId, menus }: { shopId: number; menus: PosMenu[] }) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState<"cod" | "gcash">("cod");
  const [tendered, setTendered] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [msg, setMsg] = useState<{ kind: "success" | "danger"; text: string; orderId?: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(menus.map((m) => m.category?.trim()).filter(Boolean) as string[]))],
    [menus]
  );
  const shown = category === "All" ? menus : menus.filter((m) => m.category?.trim() === category);
  const lines = menus.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] }));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const cash = parseFloat(tendered);
  const change = payment === "cod" && Number.isFinite(cash) ? cash - total : null;

  function add(id: number, delta: number) {
    setMsg(null);
    setCart((c) => {
      const qty = Math.max(0, Math.min(99, (c[id] ?? 0) + delta));
      const next = { ...c };
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });
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
        setMsg({ kind: "danger", text: res.error });
        return;
      }
      setMsg({ kind: "success", text: `Order #${res.orderId} sent to the kitchen — ${peso(res.total)} paid.`, orderId: res.orderId });
      setCart({});
      setCustomer("");
      setTendered("");
    });
  }

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        {categories.length > 2 ? (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${c === category ? "btn-dark" : "btn-outline-secondary bg-white"}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
        {menus.length === 0 ? (
          <div className="staff-panel">
            <div className="staff-panel__body text-muted text-center py-4">
              No active menu items for this shop yet.
            </div>
          </div>
        ) : (
          <div className="row g-2">
            {shown.map((m) => (
              <div key={m.id} className="col-6 col-md-4 col-xl-3">
                <button
                  type="button"
                  className="staff-panel w-100 h-100 text-start p-0 border-0 position-relative"
                  onClick={() => add(m.id, 1)}
                >
                  <img
                    src={m.imageSrc}
                    alt=""
                    className="w-100 rounded-top"
                    style={{ aspectRatio: "4 / 3", objectFit: "cover" }}
                    loading="lazy"
                  />
                  <span className="d-block p-2">
                    <span className="d-block small fw-semibold text-truncate">{m.name}</span>
                    <span className="d-block small text-muted tabular-nums">{peso(m.price)}</span>
                  </span>
                  {cart[m.id] ? (
                    <span className="badge rounded-pill text-bg-danger position-absolute top-0 end-0 m-2">
                      {cart[m.id]}
                    </span>
                  ) : null}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="col-12 col-lg-4">
        <div className="staff-panel position-sticky" style={{ top: "1rem" }}>
          <div className="staff-panel__head">
            <i className="bi bi-cart3" aria-hidden="true" />
            <span>Current sale</span>
          </div>
          <div className="staff-panel__body">
            {msg ? (
              <div className={`alert alert-${msg.kind} py-2 small`}>
                {msg.text}
                {msg.orderId ? (
                  <>
                    {" "}
                    <a href={`/admin/orders/${msg.orderId}/receipt`} target="_blank" rel="noopener noreferrer" className="alert-link">
                      Print receipt
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}

            {lines.length === 0 ? (
              <p className="text-muted small mb-3">Tap items to add them.</p>
            ) : (
              <ul className="list-unstyled mb-3">
                {lines.map((l) => (
                  <li key={l.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                    <span className="flex-grow-1 small text-truncate">{l.name}</span>
                    <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => add(l.id, -1)} aria-label={`Remove one ${l.name}`}>
                      −
                    </button>
                    <span className="tabular-nums small" style={{ minWidth: 20, textAlign: "center" }}>{l.qty}</span>
                    <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => add(l.id, 1)} aria-label={`Add one ${l.name}`}>
                      +
                    </button>
                    <span className="tabular-nums small text-end" style={{ minWidth: 70 }}>{peso(l.price * l.qty)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
              <span>Total</span>
              <span className="tabular-nums">{peso(total)}</span>
            </div>

            <label className="form-label small mb-1" htmlFor="pos-customer">Customer name</label>
            <input
              id="pos-customer"
              className="form-control form-control-sm mb-2"
              placeholder="Walk-in"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />

            <div className="btn-group w-100 mb-2" role="group" aria-label="Payment method">
              <button type="button" className={`btn btn-sm ${payment === "cod" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setPayment("cod")}>
                Cash
              </button>
              <button type="button" className={`btn btn-sm ${payment === "gcash" ? "btn-dark" : "btn-outline-secondary"}`} onClick={() => setPayment("gcash")}>
                GCash
              </button>
            </div>

            {payment === "cod" ? (
              <>
                <label className="form-label small mb-1" htmlFor="pos-cash">Cash received</label>
                <input
                  id="pos-cash"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="form-control form-control-sm mb-1"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                />
                {change !== null ? (
                  <p className={`small mb-2 ${change < 0 ? "text-danger" : "text-success"}`}>
                    {change < 0 ? `Short ${peso(-change)}` : `Change ${peso(change)}`}
                  </p>
                ) : null}
              </>
            ) : null}

            <button
              type="button"
              className="staff-btn staff-btn--primary w-100 justify-content-center mt-2"
              disabled={pending || lines.length === 0 || (change !== null && change < 0)}
              onClick={checkout}
            >
              {pending ? "Saving…" : `Charge ${peso(total)}`}
            </button>
            {lines.length > 0 ? (
              <button type="button" className="btn btn-link btn-sm w-100 text-muted mt-1" onClick={() => setCart({})}>
                Clear sale
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
