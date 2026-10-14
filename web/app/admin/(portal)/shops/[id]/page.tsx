import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff-session";
import { shopLogoSrc } from "@/lib/shop-logos";
import { ShopForm } from "@/components/admin/shop-form";

type Params = Promise<{ id: string }>;

export default async function AdminEditShopPage({ params }: { params: Params }) {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id) || id < 1) redirect("/admin/shops");

  const admin = createAdminClient();
  if (!admin) redirect("/admin/shops?error=config");

  const { data: shop } = await admin
    .from("restaurants")
    .select("id, name, description, logo, delivery_time, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!shop) redirect("/admin/shops");

  return (
    <div className="staff-form-page">
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">Edit shop</h1>
        <p className="staff-page-head__sub">{shop.name}</p>
      </header>
      <ShopForm
        mode="edit"
        shop={{
          id: Number(shop.id),
          name: String(shop.name),
          description: shop.description as string | null,
          delivery_time: shop.delivery_time as string | null,
          is_active: Boolean(shop.is_active),
          logoSrc: shopLogoSrc(shop.logo as string | null),
        }}
      />
    </div>
  );
}
