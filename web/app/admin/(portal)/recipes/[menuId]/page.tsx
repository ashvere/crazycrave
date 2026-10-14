import { redirect } from "next/navigation";
import { KitchenPage } from "@/components/admin/kitchen-page";
import { RecipeForm } from "@/components/admin/recipe-form";
import { shopInventory } from "@/lib/kitchen-ops";

type Search = Promise<{ shop_id?: string; done?: string; error?: string }>;

export default async function AdminRecipeEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ menuId: string }>;
  searchParams: Search;
}) {
  const menuId = parseInt((await params).menuId, 10);
  const search = await searchParams;
  return (
    <KitchenPage title="Recipe" sub="Ingredients, prep, and nutrition" basePath={`/admin/recipes/${menuId}`} search={search}>
      {async ({ shopId, admin }) => {
        const { data: menu } = await admin
          .from("menus")
          .select("id, name")
          .eq("id", menuId)
          .eq("restaurant_id", shopId)
          .maybeSingle();
        if (!menu) redirect(`/admin/recipes?shop_id=${shopId}`);

        const [{ data: recipe }, inventory] = await Promise.all([
          admin.from("kitchen_recipes").select("*").eq("menu_id", menuId).maybeSingle(),
          shopInventory(admin, shopId),
        ]);
        const { data: ings } = recipe
          ? await admin.from("kitchen_recipe_ingredients").select("inventory_id, quantity").eq("recipe_id", recipe.id)
          : { data: [] as { inventory_id: number; quantity: number }[] };

        return (
          <>
            <h2 className="h5 fw-bold mb-3">{menu.name}</h2>
            <RecipeForm
              shopId={shopId}
              menuId={menuId}
              recipe={
                recipe
                  ? {
                      prep_minutes: Number(recipe.prep_minutes),
                      yield_servings: Number(recipe.yield_servings),
                      steps: recipe.steps as string | null,
                      calories: recipe.calories as number | null,
                      allergens: recipe.allergens as string | null,
                      protein_g: recipe.protein_g != null ? Number(recipe.protein_g) : null,
                      carbs_g: recipe.carbs_g != null ? Number(recipe.carbs_g) : null,
                      fat_g: recipe.fat_g != null ? Number(recipe.fat_g) : null,
                    }
                  : null
              }
              ingredients={(ings ?? []).map((i) => ({ inventory_id: Number(i.inventory_id), quantity: Number(i.quantity) }))}
              inventory={inventory.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
            />
          </>
        );
      }}
    </KitchenPage>
  );
}
