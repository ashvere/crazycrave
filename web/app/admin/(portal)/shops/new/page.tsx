import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/staff-session";
import { ShopForm } from "@/components/admin/shop-form";

export default async function AdminNewShopPage() {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin");

  return (
    <div className="staff-form-page">
      <header className="staff-page-head">
        <h1 className="staff-page-head__title">Add shop</h1>
        <p className="staff-page-head__sub">Create a new location and, optionally, a kitchen manager account</p>
      </header>
      <ShopForm mode="create" />
    </div>
  );
}
