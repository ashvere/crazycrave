import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";
import { StaffLoginForm } from "@/components/admin/staff-login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AdminLoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="rider-login-panel p-4 mx-auto" style={{ maxWidth: 520 }}>
        <h1 className="h4 fw-bold mb-3">Staff sign-in unavailable</h1>
        <p className="text-muted">
          Add <code className="px-1 rounded bg-light">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="px-1 rounded bg-light">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="px-1 rounded bg-light">web/.env.local</code> (or your host&apos;s environment
          variables), then restart the dev server or redeploy.
        </p>
      </main>
    );
  }

  const staff = await getStaffSession();
  if (staff) {
    redirect("/admin");
  }

  return (
    <Suspense
      fallback={<p className="text-center text-muted py-5">Loading…</p>}
    >
      <StaffLoginForm />
    </Suspense>
  );
}
