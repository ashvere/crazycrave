import Link from "next/link";
import { KitchenPage } from "@/components/admin/kitchen-page";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { isLow, pesoFmt, qtyFmt, shopInventory } from "@/lib/kitchen-ops";
import { addInventoryItem, adjustInventory, deleteInventoryItem } from "../kitchen-actions";

type Search = Promise<{ shop_id?: string; done?: string; error?: string }>;

const REASON_LABEL: Record<string, string> = {
  adjustment: "Adjustment",
  waste: "Waste",
  receive: "Received",
  sale: "Sale",
  recipe_deduct: "Used in order",
};

export default async function AdminInventoryPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  return (
    <KitchenPage
      title="Inventory"
      sub="Ingredients, counts, and low-stock alerts. Completed orders deduct recipe ingredients automatically."
      basePath="/admin/inventory"
      search={search}
      actions={({ shopId }) => (
        <div className="d-flex gap-2">
          <Link href={`/admin/waste?shop_id=${shopId}`} className="staff-btn staff-btn--secondary">
            <i className="bi bi-trash3" aria-hidden="true" /> Waste
          </Link>
          <Link href={`/admin/purchase-orders?shop_id=${shopId}`} className="staff-btn staff-btn--secondary">
            <i className="bi bi-truck" aria-hidden="true" /> Purchase orders
          </Link>
        </div>
      )}
    >
      {async ({ shopId, admin }) => {
        const items = await shopInventory(admin, shopId);
        const low = items.filter(isLow);
        const value = items.reduce((s, i) => s + i.qty_on_hand * i.cost_per_unit, 0);
        const { data: moves } = await admin
          .from("kitchen_inventory_moves")
          .select("id, inventory_id, delta_qty, reason, note, created_at")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false })
          .limit(15);
        const nameBy = new Map(items.map((i) => [i.id, i]));

        return (
          <>
            {low.length > 0 ? (
              <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span>
                  <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                  <strong>{low.length} low on stock:</strong> {low.map((i) => i.name).join(", ")}
                </span>
                <Link href={`/admin/purchase-orders?shop_id=${shopId}`} className="alert-link">
                  Create purchase order →
                </Link>
              </div>
            ) : null}

            <div className="staff-metrics-grid mb-3">
              <article className="staff-metric">
                <p className="staff-metric__label">Items</p>
                <p className="staff-metric__value tabular-nums">{items.length}</p>
              </article>
              <article className="staff-metric staff-metric--amber">
                <p className="staff-metric__label">Low stock</p>
                <p className="staff-metric__value tabular-nums">{low.length}</p>
              </article>
              <article className="staff-metric">
                <p className="staff-metric__label">Stock value</p>
                <p className="staff-metric__value tabular-nums">{pesoFmt(value)}</p>
              </article>
            </div>

            <section className="staff-panel mb-3">
              <div className="staff-panel__head">
                <i className="bi bi-boxes" aria-hidden="true" />
                <span>Stock on hand</span>
              </div>
              <div className="staff-panel__body staff-table-wrap">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-end">On hand</th>
                      <th className="text-end">Reorder at</th>
                      <th className="text-end">Cost / unit</th>
                      <th>Adjust (+ add / − remove)</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className={isLow(i) ? "table-warning" : undefined}>
                        <td>
                          <div className="fw-semibold">{i.name}</div>
                          <div className="small text-muted">
                            {i.sku}
                            {i.supplier_name ? ` · ${i.supplier_name}` : ""}
                          </div>
                        </td>
                        <td className="text-end tabular-nums fw-semibold">
                          {qtyFmt(i.qty_on_hand)} {i.unit}
                        </td>
                        <td className="text-end tabular-nums text-muted">
                          {qtyFmt(i.reorder_level)} {i.unit}
                        </td>
                        <td className="text-end tabular-nums">{pesoFmt(i.cost_per_unit)}</td>
                        <td>
                          <form action={adjustInventory} className="d-flex gap-1">
                            <input type="hidden" name="shop_id" value={shopId} />
                            <input type="hidden" name="inventory_id" value={i.id} />
                            <input
                              type="number"
                              name="delta"
                              step="0.001"
                              required
                              className="form-control form-control-sm"
                              style={{ width: 90 }}
                              placeholder="±qty"
                              aria-label={`Change in ${i.name}`}
                            />
                            <input
                              name="note"
                              className="form-control form-control-sm"
                              style={{ width: 140 }}
                              placeholder="Note"
                              aria-label="Note"
                            />
                            <button type="submit" className="btn btn-sm btn-dark">
                              Save
                            </button>
                          </form>
                        </td>
                        <td>
                          <form action={deleteInventoryItem}>
                            <input type="hidden" name="shop_id" value={shopId} />
                            <input type="hidden" name="inventory_id" value={i.id} />
                            <ConfirmSubmit
                              message={`Delete ${i.name}? It is also removed from any recipes.`}
                              className="btn btn-sm btn-outline-danger"
                            >
                              <i className="bi bi-trash3" aria-hidden="true" />
                              <span className="visually-hidden">Delete {i.name}</span>
                            </ConfirmSubmit>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <section className="staff-panel h-100">
                  <div className="staff-panel__head">
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    <span>Add ingredient</span>
                  </div>
                  <form action={addInventoryItem} className="staff-panel__body row g-2">
                    <input type="hidden" name="shop_id" value={shopId} />
                    <div className="col-5">
                      <label className="form-label small mb-1">SKU</label>
                      <input name="sku" className="form-control form-control-sm" required maxLength={40} />
                    </div>
                    <div className="col-7">
                      <label className="form-label small mb-1">Name</label>
                      <input name="name" className="form-control form-control-sm" required />
                    </div>
                    <div className="col-4">
                      <label className="form-label small mb-1">Unit</label>
                      <input name="unit" className="form-control form-control-sm" placeholder="kg, L, pcs" />
                    </div>
                    <div className="col-4">
                      <label className="form-label small mb-1">Starting qty</label>
                      <input name="qty_on_hand" type="number" step="0.001" min="0" className="form-control form-control-sm" />
                    </div>
                    <div className="col-4">
                      <label className="form-label small mb-1">Reorder at</label>
                      <input name="reorder_level" type="number" step="0.001" min="0" className="form-control form-control-sm" />
                    </div>
                    <div className="col-5">
                      <label className="form-label small mb-1">Cost / unit (₱)</label>
                      <input name="cost_per_unit" type="number" step="0.01" min="0" className="form-control form-control-sm" />
                    </div>
                    <div className="col-7">
                      <label className="form-label small mb-1">Supplier</label>
                      <input name="supplier_name" className="form-control form-control-sm" />
                    </div>
                    <div className="col-12">
                      <button type="submit" className="staff-btn staff-btn--primary">
                        Add item
                      </button>
                    </div>
                  </form>
                </section>
              </div>
              <div className="col-12 col-lg-6">
                <section className="staff-panel h-100">
                  <div className="staff-panel__head">
                    <i className="bi bi-clock-history" aria-hidden="true" />
                    <span>Recent stock moves</span>
                  </div>
                  <div className="staff-panel__body">
                    {(moves ?? []).length === 0 ? (
                      <p className="text-muted small mb-0">No stock changes yet.</p>
                    ) : (
                      <ul className="list-unstyled small mb-0">
                        {(moves ?? []).map((m) => {
                          const it = nameBy.get(Number(m.inventory_id));
                          const d = Number(m.delta_qty);
                          return (
                            <li key={m.id} className="d-flex justify-content-between gap-2 py-1 border-bottom">
                              <span>
                                <strong>{it?.name ?? "Item"}</strong>{" "}
                                <span className="text-muted">
                                  · {REASON_LABEL[String(m.reason)] ?? m.reason}
                                  {m.note ? ` · ${m.note}` : ""}
                                </span>
                              </span>
                              <span className={`tabular-nums text-nowrap ${d < 0 ? "text-danger" : "text-success"}`}>
                                {d > 0 ? "+" : ""}
                                {qtyFmt(d)} {it?.unit ?? ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </>
        );
      }}
    </KitchenPage>
  );
}
