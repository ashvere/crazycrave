"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createMenuItem, updateMenuItem } from "@/app/admin/actions";
import { menuImageSrc } from "@/lib/shop-logos";

type Menu = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category?: string | null;
};

export function MenuItemEditor({
  mode,
  shopId,
  shopName,
  menu,
}: {
  mode: "create" | "edit";
  shopId: number;
  shopName: string;
  menu?: Menu;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(menu?.image ? menuImageSrc(menu.image) : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res =
      mode === "create" ? await createMenuItem(fd) : await updateMenuItem(fd);
    setLoading(false);
    if (res && "error" in res && res.error) {
      setErr(res.error);
      return;
    }
    router.push(`/admin/menus?shop_id=${shopId}`);
    router.refresh();
  }

  return (
    <>
      <div className="mb-3">
        <Link href={`/admin/menus?shop_id=${shopId}`} className="staff-chip staff-chip--menus text-decoration-none">
          ← {shopName} menus
        </Link>
      </div>
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">
          {mode === "create" ? "Add menu item" : "Edit menu item"}
        </h1>
      </header>

      {err ? (
        <div className="alert alert-danger" role="alert">
          {err}
        </div>
      ) : null}

      <form className="staff-panel staff-panel__body p-3" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
        <input type="hidden" name="shop_id" value={shopId} />
        {mode === "edit" && menu ? <input type="hidden" name="menu_id" value={menu.id} /> : null}
        <div className="mb-3">
          <label className="form-label" htmlFor="m-name">
            Name
          </label>
          <input
            id="m-name"
            name="name"
            className="form-control"
            required
            defaultValue={menu?.name ?? ""}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="m-desc">
            Description
          </label>
          <textarea
            id="m-desc"
            name="description"
            className="form-control"
            rows={3}
            defaultValue={menu?.description ?? ""}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="m-price">
            Price (₱)
          </label>
          <input
            id="m-price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            className="form-control"
            required
            defaultValue={menu ? String(menu.price) : ""}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="m-cat">
            Category
          </label>
          <input
            id="m-cat"
            name="category"
            className="form-control"
            placeholder="e.g. Chicken, Sides, Drinks"
            defaultValue={menu?.category ?? ""}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="m-file">
            Photo
          </label>
          {preview ? (
            <img src={preview} alt="" className="d-block rounded border mb-2" style={{ width: 160, height: 120, objectFit: "cover" }} />
          ) : null}
          <input
            id="m-file"
            name="image_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="form-control"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : menu?.image ? menuImageSrc(menu.image) : null);
            }}
          />
          <p className="small text-muted mt-1 mb-2">JPG, PNG or WebP up to 2 MB.{mode === "edit" ? " Leave empty to keep the current photo." : ""}</p>
          <details>
            <summary className="small text-muted">Or use an existing image path</summary>
            <input
              id="m-img"
              name="image"
              className="form-control form-control-sm mt-2"
              placeholder="e.g. crispy_king/chicken.jpg"
              defaultValue={menu?.image ?? ""}
            />
            <p className="small text-muted mt-1 mb-0">
              Relative to <code>images/menus/</code>, or a full image URL.
            </p>
          </details>
        </div>
        <button type="submit" className="staff-btn staff-btn--primary" disabled={loading}>
          {loading ? "Saving…" : mode === "create" ? "Create item" : "Save changes"}
        </button>
      </form>
    </>
  );
}
