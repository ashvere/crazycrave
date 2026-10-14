import { KitchenPage } from "@/components/admin/kitchen-page";
import { isLow, pesoFmt, qtyFmt, shopInventory } from "@/lib/kitchen-ops";
import { generatePurchaseOrder, setPurchaseOrderStatus } from "../kitchen-actions";

type Search = Promise<{ shop_id?: string; done?: string; error?: string }>;

const STATUS_BADGE: Record<string, string> = {
  draft: "secondary",
  sent: "primary",
  received: "success",
  cancelled: "danger",
};

export default async function AdminPurchaseOrdersPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  return (
    <KitchenPage
      title="Purchase orders"
      sub="Restock from low-stock alerts; receiving a PO adds it to inventory."
      basePath="/admin/purchase-orders"
      search={search}
      actions={({ shopId }) => (
        <form action={generatePurchaseOrder}>
          <input type="hidden" name="shop_id" value={shopId} />
          <button type="submit" className="staff-btn staff-btn--primary">
            <i className="bi bi-magic" aria-hidden="true" /> Generate from low stock
          </button>
        </form>
      )}
    >
      {async ({ shopId, admin }) => {
        const items = await shopInventory(admin, shopId);
        const nameBy = new Map(items.map((i) => [i.id, i]));
        const lowCount = items.filter(isLow).length;
        const { data: pos } = await admin
          .from("kitchen_purchase_orders")
          .select("id, po_number, supplier_name, status, notes, created_at")
          .eq("shop_id", shopId)
          .order("id", { ascending: false })
          .limit(20);
        const ids = (pos ?? []).map((p) => p.id);
        const { data: lines } = ids.length
          ? await admin
              .from("kitchen_purchase_order_items")
              .select("po_id, inventory_id, qty_ordered, qty_received, unit_cost")
              .in("po_id", ids)
          : { data: [] as { po_id: number; inventory_id: number; qty_ordered: number; qty_received: number; unit_cost: number }[] };

        return (
          <>
            <p className="small text-muted">
              {lowCount > 0 ? `${lowCount} item(s) are at or below their reorder level.` : "No items are low on stock."}
            </p>
            {(pos ?? []).length === 0 ? (
              <div className="staff-panel">
                <div className="staff-panel__body text-muted text-center py-4">No purchase orders yet.</div>
              </div>
            ) : (
              <div className="d-grid gap-3">
                {(pos ?? []).map((po) => {
                  const poLines = (lines ?? []).filter((l) => Number(l.po_id) === Number(po.id));
                  const total = poLines.reduce((s, l) => s + Number(l.qty_ordered) * Number(l.unit_cost), 0);
                  const open = po.status === "draft" || po.status === "sent";
                  return (
                    <section key={po.id} className="staff-panel">
                      <div className="staff-panel__body">
                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                          <div>
                            <strong className="font-monospace">{po.po_number}</strong>{" "}
                            <span className={`badge text-bg-${STATUS_BADGE[String(po.status)] ?? "secondary"} text-capitalize`}>
                              {po.status}
                            </span>
                            <div className="small text-muted">
                              {po.supplier_name} ·{" "}
                              {new Date(String(po.created_at)).toLocaleDateString("en-PH", {
                                timeZone: "Asia/Manila",
                                dateStyle: "medium",
                              })}
                              {po.notes ? ` · ${po.notes}` : ""}
                            </div>
                          </div>
                          <strong className="tabular-nums">{pesoFmt(total)}</strong>
                        </div>
                        <table className="table table-sm small mb-2">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th className="text-end">Ordered</th>
                              <th className="text-end">Received</th>
                              <th className="text-end">Unit cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {poLines.map((l, i) => {
                              const it = nameBy.get(Number(l.inventory_id));
                              return (
                                <tr key={i}>
                                  <td>{it?.name ?? "Item"}</td>
                                  <td className="text-end tabular-nums">
                                    {qtyFmt(Number(l.qty_ordered))} {it?.unit ?? ""}
                                  </td>
                                  <td className="text-end tabular-nums">{qtyFmt(Number(l.qty_received))}</td>
                                  <td className="text-end tabular-nums">{pesoFmt(Number(l.unit_cost))}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {open ? (
                          <div className="d-flex flex-wrap gap-2">
                            {po.status === "draft" ? (
                              <form action={setPurchaseOrderStatus}>
                                <input type="hidden" name="shop_id" value={shopId} />
                                <input type="hidden" name="po_id" value={po.id} />
                                <input type="hidden" name="status" value="sent" />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Mark sent</button>
                              </form>
                            ) : null}
                            <form action={setPurchaseOrderStatus}>
                              <input type="hidden" name="shop_id" value={shopId} />
                              <input type="hidden" name="po_id" value={po.id} />
                              <input type="hidden" name="status" value="received" />
                              <button type="submit" className="btn btn-sm btn-success">Receive into stock</button>
                            </form>
                            <form action={setPurchaseOrderStatus}>
                              <input type="hidden" name="shop_id" value={shopId} />
                              <input type="hidden" name="po_id" value={po.id} />
                              <input type="hidden" name="status" value="cancelled" />
                              <button type="submit" className="btn btn-sm btn-outline-danger">Cancel</button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        );
      }}
    </KitchenPage>
  );
}
