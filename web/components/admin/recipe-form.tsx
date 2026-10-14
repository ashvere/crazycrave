"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveRecipe, type RecipeFormState } from "@/app/admin/(portal)/kitchen-actions";

type Recipe = {
  prep_minutes: number;
  yield_servings: number;
  steps: string | null;
  calories: number | null;
  allergens: string | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export function RecipeForm({
  shopId,
  menuId,
  recipe,
  ingredients,
  inventory,
}: {
  shopId: number;
  menuId: number;
  recipe: Recipe | null;
  ingredients: { inventory_id: number; quantity: number }[];
  inventory: { id: number; name: string; unit: string }[];
}) {
  const [state, action, pending] = useActionState<RecipeFormState, FormData>(saveRecipe, null);
  const [rows, setRows] = useState(
    ingredients.length ? ingredients.map((i, k) => ({ key: k, ...i })) : [{ key: 0, inventory_id: inventory[0]?.id ?? 0, quantity: 0 }]
  );
  const [nextKey, setNextKey] = useState(rows.length);

  const field = (name: keyof Recipe, label: string, step = "1") => (
    <div className="col-6 col-md-3">
      <label className="form-label small mb-1" htmlFor={`r-${name}`}>{label}</label>
      <input
        id={`r-${name}`}
        name={name}
        type="number"
        step={step}
        min="0"
        className="form-control form-control-sm"
        defaultValue={recipe?.[name] != null ? String(recipe[name]) : ""}
      />
    </div>
  );

  return (
    <form action={action} className="staff-panel">
      <div className="staff-panel__body">
        {state?.error ? <div className="alert alert-danger">{state.error}</div> : null}
        <input type="hidden" name="shop_id" value={shopId} />
        <input type="hidden" name="menu_id" value={menuId} />

        <h2 className="h6 fw-bold">Ingredients per serving</h2>
        {inventory.length === 0 ? (
          <p className="small text-muted">
            Add ingredients on the <Link href={`/admin/inventory?shop_id=${shopId}`}>Inventory</Link> page first.
          </p>
        ) : (
          <div className="mb-3">
            {rows.map((r) => (
              <div key={r.key} className="d-flex gap-2 mb-2">
                <select
                  name="ing_inventory_id"
                  className="form-select form-select-sm"
                  defaultValue={r.inventory_id}
                  aria-label="Ingredient"
                >
                  {inventory.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
                <input
                  name="ing_quantity"
                  type="number"
                  step="0.001"
                  min="0"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 120 }}
                  defaultValue={r.quantity || ""}
                  placeholder="Qty"
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  aria-label="Remove ingredient"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setRows((rs) => [...rs, { key: nextKey, inventory_id: inventory[0].id, quantity: 0 }]);
                setNextKey((k) => k + 1);
              }}
            >
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Add ingredient
            </button>
          </div>
        )}

        <h2 className="h6 fw-bold mt-3">Kitchen details</h2>
        <div className="row g-2 mb-2">
          {field("prep_minutes", "Prep (minutes)")}
          {field("yield_servings", "Yield (servings)")}
          {field("calories", "Calories")}
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="r-allergens">Allergens</label>
            <input id="r-allergens" name="allergens" className="form-control form-control-sm" defaultValue={recipe?.allergens ?? ""} />
          </div>
          {field("protein_g", "Protein (g)", "0.1")}
          {field("carbs_g", "Carbs (g)", "0.1")}
          {field("fat_g", "Fat (g)", "0.1")}
        </div>
        <label className="form-label small mb-1" htmlFor="r-steps">Steps</label>
        <textarea id="r-steps" name="steps" rows={5} className="form-control form-control-sm mb-3" defaultValue={recipe?.steps ?? ""} />

        <div className="d-flex gap-2">
          <Link href={`/admin/recipes?shop_id=${shopId}`} className="staff-btn staff-btn--secondary">
            Cancel
          </Link>
          <button type="submit" className="staff-btn staff-btn--primary" disabled={pending}>
            {pending ? "Saving…" : "Save recipe"}
          </button>
        </div>
      </div>
    </form>
  );
}
