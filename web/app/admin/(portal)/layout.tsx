import { StaffBodyClass } from "@/components/admin/staff-body-class";
import { StaffTopbar } from "@/components/store/staff-topbar";
import { requireStaff } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();

  // Unread rider messages for the nav badge (0 if messaging isn't set up yet).
  let unreadMessages = 0;
  const admin = staff.role === "admin" ? createAdminClient() : null;
  if (admin) {
    const { count } = await admin
      .from("rider_staff_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "rider")
      .is("read_at_staff", null);
    unreadMessages = count ?? 0;
  }

  return (
    <>
      <StaffBodyClass />
      <StaffTopbar
        displayName={staff.displayName}
        role={staff.role}
        restaurantId={staff.restaurantId}
        unreadMessages={unreadMessages}
      />
      <main className="staff-main">{children}</main>
    </>
  );
}
