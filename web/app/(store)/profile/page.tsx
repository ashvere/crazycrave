import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/lib/customer-profile";
import { ProfileView } from "@/components/store/profile-view";

type Search = Promise<{ saved?: string; error?: string }>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required&next=/profile");

  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("display_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (pe || !profile) redirect("/?login=required");

  const role = profile.role as string;
  if (role === "rider") redirect("/rider");
  if (role === "admin" || role === "restaurant") redirect("/admin");

  const displayName =
    (profile.display_name as string | null)?.trim() || user.email?.split("@")[0] || "Customer";
  const customer = await getCustomerProfile(supabase, user.id);

  const created = profile.created_at as string | null;
  const memberSince = created
    ? new Date(created).toLocaleString(undefined, { month: "short", year: "numeric" })
    : "";

  const sp = await searchParams;
  let flash: { kind: "success" | "error"; message: string } | null = null;
  if (sp.error) {
    flash = { kind: "error", message: decodeURIComponent(sp.error) };
  } else if (sp.saved === "account") {
    flash = { kind: "success", message: "Account details saved." };
  } else if (sp.saved === "payments") {
    flash = {
      kind: "success",
      message:
        "Payment details saved. We only store the last 4 digits of your card — never the full number or CVV.",
    };
  } else if (sp.saved === "password") {
    flash = { kind: "success", message: "Password updated successfully." };
  }

  return (
    <ProfileView
      displayName={displayName}
      email={user.email ?? ""}
      memberSince={memberSince}
      customer={customer}
      flash={flash}
    />
  );
}
