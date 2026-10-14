import { KitchenPage } from "@/components/admin/kitchen-page";
import { pesoFmt, qtyFmt, shopInventory } from "@/lib/kitchen-ops";
import { logWaste } from "../kitchen-actions";

type Search = Promise<{ shop_id?: string; done?: string; error?: string }>;

const REASONS = ["Spoilage", "Overcooked", "Dropped", "Expired", "Customer return", "Other"];

export default async function AdminWastePage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  return (
    <KitchenPage title="Waste log" sub="Record spoilage; stock is deducted and cost tracked." basePath="/admin/waste" search={search}>
      {async ({ shopId, admin }) => {
        const items = await shopInventory(admin, shopId);
        const nameBy = new Map(items.map((i) => [i.id, i]));
        const { data: logs } = await admin
          .from("kitchen_waste_logs")
          .select("id, inventory_id, qty, reason, cost_impact, created_at")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false })
          .limit(30);
        const total = (logs ?? []).reduce((s, l) => s + Number(l.cost_impact), 0);

        return (
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <section className="staff-panel">
                <div className="staff-panel__head">
                  <i className="bi bi-trash3" aria-hidden="true" />
                  <span>Log waste</span>
                </div>
                <form action={logWaste} className="staff-panel__body">
                  <input type="hidden" name="shop_id" value={shopId} />
                  <label className="form-label small mb-1" htmlFor="w-item">Item</label>
                  <select id="w-item" name="inventory_id" className="form-select form-select-sm mb-2" required>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({qtyFmt(i.qty_on_hand)} {i.unit} on hand)
                      </option>
                    ))}
                  </select>
                  <label className="form-label small mb-1" htmlFor="w-qty">Quantity</label>
                  <input id="w-qty" name="qty" type="number" step="0.001" min="0.001" required className="form-control form-control-sm mb-2" />
                  <label className="form-label small mb-1" htmlFor="w-reason">Reason</label>
                  <select id="w-reason" name="reason" className="form-select form-select-sm mb-3">
                    {REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <button type="submit" className="staff-btn staff-btn--primary w-100 justify-content-center">
                    Log waste
                  </button>
                </form>
              </section>
            </div>
            <div className="col-12 col-lg-8">
              <section className="staff-panel">
                <div className="staff-panel__head">
                  <i className="bi bi-clock-history" aria-hidden="true" />
                  <span>Recent waste · {pesoFmt(total)} cost (last 30 entries)</span>
                </div>
                <div className="staff-panel__body staff-table-wrap">
                  {(logs ?? []).length === 0 ? (
                    <p className="text-muted small mb-0">No waste logged yet.</p>
                  ) : (
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Item</th>
                          <th className="text-end">Qty</th>
                          <th>Reason</th>
                          <th className="text-end">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(logs ?? []).map((l) => {
                          const it = nameBy.get(Number(l.inventory_id));
                          return (
                            <tr key={l.id}>
                              <td className="small text-muted">
                                {new Date(String(l.created_at)).toLocaleString("en-PH", {
                                  timeZone: "Asia/Manila",
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td>{it?.name ?? "Item"}</td>
                              <td className="text-end tabular-nums">
                                {qtyFmt(Number(l.qty))} {it?.unit ?? ""}
                              </td>
                              <td>{l.reason}</td>
                              <td className="text-end tabular-nums">{pesoFmt(Number(l.cost_impact))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>
          </div>
        );
      }}
    </KitchenPage>
  );
}
