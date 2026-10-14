import { RiderPageShell } from "@/components/rider/rider-page-shell";
import { RiderGps } from "@/components/rider/rider-gps";
import { fetchMyDeliveries, getRiderContext, isActive } from "@/lib/rider-portal";
import { mapsDestination } from "@/lib/rider-maps";

export default async function RiderTrackingPage() {
  const { supabase, user, riderName } = await getRiderContext();
  const stops = (await fetchMyDeliveries(supabase, user.id))
    .filter(isActive)
    .filter((o) => !/pickup/i.test(o.barangay))
    .map((o) => ({
      id: o.id,
      customer: o.customer_display_name || "Customer",
      barangay: o.barangay,
      dest: mapsDestination(o.delivery_address, o.barangay),
    }));

  return (
    <RiderPageShell
      riderName={riderName}
      kicker="On the road"
      title="GPS"
      lede="Turn on location to get directions from where you are to each stop."
    >
      <RiderGps stops={stops} />
    </RiderPageShell>
  );
}
