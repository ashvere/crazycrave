import Link from "next/link";
import Script from "next/script";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  claimRiderOrder,
  fetchRiderOrderById,
  fetchRiderProfile,
} from "@/lib/rider-data";
import { RiderProofForm } from "@/components/rider/rider-proof-form";
import { RiderTopbar } from "@/components/rider/rider-topbar";
import { RiderDockNav } from "@/components/rider/rider-dock-nav";

type Props = { params: Promise<{ id: string }> };

export default async function RiderCompleteDeliveryPage({ params }: Props) {
  const { id: idRaw } = await params;
  const orderId = parseInt(idRaw, 10);
  if (!Number.isFinite(orderId) || orderId < 1) redirect("/rider");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/rider/login");

  const profile = await fetchRiderProfile(supabase, user.id);
  if (!profile) redirect("/rider/login");

  await claimRiderOrder(supabase, orderId, user.id);
  const order = await fetchRiderOrderById(supabase, orderId);
  if (!order || order.rider_id !== user.id) redirect("/rider");

  if (order.delivery_status === "delivered") {
    redirect(`/rider/order/${orderId}`);
  }

  const riderName =
    profile.display_name?.trim() || user.email?.split("@")[0] || "Rider";

  return (
    <>
      <RiderTopbar displayName={riderName} />
      <main className="rider-dash-page">
        <div className="container-fluid rider-dash-page__inner" style={{ maxWidth: 560 }}>
          <Link href={`/rider/order/${orderId}`} className="rider-back">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            <span>Order #{orderId}</span>
          </Link>
          <p className="rider-dash-header__kicker">Last step</p>
          <h1 className="rider-dash-header__title mb-1">Complete delivery</h1>
          <p className="rider-dash-header__lede mb-3">
            Hand over the order to {order.customer_display_name || "the customer"}, then confirm here.
          </p>
          <RiderProofForm
            orderId={orderId}
            collect={
              String(order.payment_method ?? "").toLowerCase() === "cod"
                ? `₱${Number(order.total).toFixed(2)}`
                : null
            }
          />
        </div>
      </main>
      <RiderDockNav />
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="lazyOnload"
      />
    </>
  );
}
