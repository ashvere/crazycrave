import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";

type Search = Promise<{ q?: string }>;

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminCustomersPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  const q = String((await searchParams).q ?? "").trim().toLowerCase();

  const admin = createAdminClient();
  if (!admin) {
    return <div className="alert alert-warning">Add SUPABASE_SERVICE_ROLE_KEY to view customers.</div>;
  }

  const [{ data: profiles }, { data: details }, { data: orders }, emails] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false }),
    admin.from("customer_profiles").select("user_id, phone"),
    admin
      .from("orders")
      .select("customer_id, total, order_status, created_at")
      .not("customer_id", "is", null),
    (async () => {
      const map = new Map<string, string>();
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        for (const u of data.users) map.set(u.id, u.email ?? "");
        if (data.users.length < 1000) break;
      }
      return map;
    })(),
  ]);

  const phoneBy = new Map((details ?? []).map((d) => [String(d.user_id), String(d.phone ?? "")]));
  const stats = new Map<string, { count: number; spent: number; last: string }>();
  for (const o of orders ?? []) {
    const id = String(o.customer_id);
    const s = stats.get(id) ?? { count: 0, spent: 0, last: "" };
    s.count += 1;
    if (o.order_status !== "cancelled") s.spent += Number(o.total);
    if (String(o.created_at) > s.last) s.last = String(o.created_at);
    stats.set(id, s);
  }

  const all = (profiles ?? []).map((p) => {
    const id = String(p.id);
    return {
      id,
      name: String(p.display_name ?? "").trim() || "Customer",
      email: emails.get(id) ?? "",
      phone: phoneBy.get(id) ?? "",
      joined: String(p.created_at),
      ...(stats.get(id) ?? { count: 0, spent: 0, last: "" }),
    };
  });
  const list = q
    ? all.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q))
    : all;

  return (
    <>
      <header className="staff-page-head staff-page-head--row">
        <div>
          <h1 className="staff-page-head__title">Customers</h1>
          <p className="staff-page-head__sub">
            {all.length} registered · {all.filter((c) => c.count > 0).length} have ordered
          </p>
        </div>
        <form className="d-flex gap-2" role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            className="form-control form-control-sm"
            placeholder="Search name, email, phone"
            aria-label="Search customers"
          />
          <button type="submit" className="staff-btn staff-btn--secondary">
            Search
          </button>
        </form>
      </header>

      <section className="staff-panel">
        <div className="staff-panel__body staff-table-wrap">
          {list.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">{q ? "No customers match that search." : "No customers yet."}</p>
          ) : (
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="text-end">Orders</th>
                  <th className="text-end">Spent</th>
                  <th>Last order</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-semibold">{c.name}</div>
                      <div className="small text-muted">{c.email || "—"}</div>
                    </td>
                    <td className="tabular-nums">{c.phone || "—"}</td>
                    <td className="text-end tabular-nums">{c.count}</td>
                    <td className="text-end tabular-nums">{peso(c.spent)}</td>
                    <td className="small">{c.last ? day(c.last) : "—"}</td>
                    <td className="small text-muted">{day(c.joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
