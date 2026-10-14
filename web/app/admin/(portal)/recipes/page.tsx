import Link from "next/link";
import { KitchenPage } from "@/components/admin/kitchen-page";
import { pesoFmt } from "@/lib/kitchen-ops";

type Search = Promise<{ shop_id?: string; done?: string; error?: string }>;

export default async function AdminRecipesPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  return (
    <KitchenPage
      title="Recipes"
      sub="Ingredients per menu item drive automatic stock deduction and food cost."
      basePath="/admin/recipes"
      search={search}
    >
      {async ({ shopId, admin }) => {
        const [{ data: menus }, { data: recipes }, { data: inv }] = await Promise.all([
          admin.from("menus").select("id, name, price").eq("restaurant_id", shopId).order("name"),
          admin.from("kitchen_recipes").select("id, menu_id, prep_minutes, calories, allergens").eq("shop_id", shopId),
          admin.from("kitchen_inventory").select("id, cost_per_unit").eq("shop_id", shopId),
        ]);
        const recipeIds = (recipes ?? []).map((r) => r.id);
        const { data: ings } = recipeIds.length
          ? await admin.from("kitchen_recipe_ingredients").select("recipe_id, inventory_id, quantity").in("recipe_id", recipeIds)
          : { data: [] as { recipe_id: number; inventory_id: number; quantity: number }[] };
        const cost = new Map((inv ?? []).map((i) => [Number(i.id), Number(i.cost_per_unit)]));
        const recipeBy = new Map((recipes ?? []).map((r) => [Number(r.menu_id), r]));
        const foodCost = (recipeId: number) =>
          (ings ?? [])
            .filter((i) => Number(i.recipe_id) === recipeId)
            .reduce((s, i) => s + Number(i.quantity) * (cost.get(Number(i.inventory_id)) ?? 0), 0);

        return (
          <section className="staff-panel">
            <div className="staff-panel__body staff-table-wrap">
              {(menus ?? []).length === 0 ? (
                <p className="text-muted small mb-0">This shop has no menu items yet.</p>
              ) : (
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Menu item</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Food cost</th>
                      <th className="text-end">Margin</th>
                      <th>Prep</th>
                      <th>Allergens</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(menus ?? []).map((m) => {
                      const r = recipeBy.get(Number(m.id));
                      const fc = r ? foodCost(Number(r.id)) : null;
                      const price = Number(m.price);
                      return (
                        <tr key={m.id}>
                          <td className="fw-semibold">{m.name}</td>
                          <td className="text-end tabular-nums">{pesoFmt(price)}</td>
                          <td className="text-end tabular-nums">{fc !== null ? pesoFmt(fc) : "—"}</td>
                          <td className="text-end tabular-nums">
                            {fc !== null && price > 0 ? `${Math.round(((price - fc) / price) * 100)}%` : "—"}
                          </td>
                          <td className="small">{r ? `${r.prep_minutes} min` : "—"}</td>
                          <td className="small text-muted">{r?.allergens || "—"}</td>
                          <td className="text-end">
                            <Link
                              href={`/admin/recipes/${m.id}?shop_id=${shopId}`}
                              className={`btn btn-sm ${r ? "btn-outline-dark" : "btn-dark"}`}
                            >
                              {r ? "Edit recipe" : "Add recipe"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        );
      }}
    </KitchenPage>
  );
}
