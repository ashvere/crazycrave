import { RiderPageShell } from "@/components/rider/rider-page-shell";
import { DigitsInput } from "@/components/store/digits-input";
import { getRiderContext } from "@/lib/rider-portal";
import { riderUpdateProfile } from "./actions";

type Search = Promise<{ saved?: string; error?: string }>;

const memberFmt = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "long",
  year: "numeric",
});

export default async function RiderProfilePage({ searchParams }: { searchParams: Search }) {
  const { supabase, user, profile, riderName } = await getRiderContext();
  const sp = await searchParams;

  const [{ data: rp }, { data: meta }, { data: shop }] = await Promise.all([
    supabase
      .from("rider_profiles")
      .select("phone, vehicle_type, vehicle_plate, fleet_status")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
    profile.restaurant_id
      ? supabase.from("restaurants").select("name").eq("id", profile.restaurant_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rider = (rp ?? {}) as {
    phone?: string | null;
    vehicle_type?: string | null;
    vehicle_plate?: string | null;
    fleet_status?: string | null;
  };
  const shopName = (shop as { name?: string } | null)?.name ?? null;
  const since = meta?.created_at ? memberFmt.format(new Date(meta.created_at as string)) : null;

  return (
    <RiderPageShell riderName={riderName} kicker="Account" title="Profile">
      {sp.saved ? (
        <div className="alert alert-success rider-alert" role="status">
          <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
          Profile saved.
        </div>
      ) : null}
      {sp.error ? (
        <div className="alert alert-danger rider-alert" role="alert">
          <i className="bi bi-exclamation-circle-fill me-2" aria-hidden="true" />
          {sp.error}
        </div>
      ) : null}

      <section className="rider-dash-surface rider-profile-card">
        <div className="rider-profile-card__avatar" aria-hidden="true">
          {riderName.charAt(0).toUpperCase()}
        </div>
        <div className="rider-profile-card__info">
          <p className="rider-profile-card__name">{riderName}</p>
          <p className="rider-profile-card__email">{user.email}</p>
          <div className="rider-profile-card__tags">
            <span className="rider-tag rider-tag--green">
              <i className="bi bi-patch-check-fill" aria-hidden="true" /> Approved rider
            </span>
            <span className={`rider-tag${shopName ? "" : " rider-tag--amber"}`}>
              <i className="bi bi-shop" aria-hidden="true" /> {shopName ?? "No shop linked yet"}
            </span>
            {since ? (
              <span className="rider-tag">
                <i className="bi bi-calendar3" aria-hidden="true" /> Since {since}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rider-dash-section">
        <h2 className="rider-dash-section__title">
          <i className="bi bi-pencil-square" aria-hidden="true" />
          <span>Your details</span>
        </h2>
        <form action={riderUpdateProfile} className="rider-dash-surface rider-form">
          <label className="rider-form__field">
            <span className="rider-form__label">Full name</span>
            <input
              type="text"
              name="name"
              className="form-control"
              required
              maxLength={120}
              pattern="[^0-9]*[^0-9\s][^0-9]*"
              title="Name can't contain numbers."
              autoComplete="name"
              defaultValue={profile.display_name ?? ""}
            />
          </label>

          <label className="rider-form__field">
            <span className="rider-form__label">Mobile number</span>
            <DigitsInput
              type="tel"
              name="phone"
              className="form-control"
              placeholder="09XXXXXXXXX"
              maxLength={11}
              pattern="09[0-9]{9}"
              title="11-digit mobile number starting with 09, e.g. 09171234567"
              autoComplete="tel"
              defaultValue={rider.phone ?? ""}
            />
            <span className="rider-form__hint">Customers and the shop use this to message you.</span>
          </label>

          <div className="rider-form__row">
            <label className="rider-form__field">
              <span className="rider-form__label">Vehicle</span>
              <select name="vehicle_type" className="form-select" defaultValue={rider.vehicle_type ?? "motorcycle"}>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
              </select>
            </label>
            <label className="rider-form__field">
              <span className="rider-form__label">Plate number</span>
              <input
                type="text"
                name="vehicle_plate"
                className="form-control text-uppercase"
                maxLength={12}
                pattern="[A-Za-z0-9 \-]*"
                title="Letters, numbers, spaces and dashes only."
                placeholder="e.g. 123 ABC"
                defaultValue={rider.vehicle_plate ?? ""}
              />
            </label>
          </div>

          <fieldset className="rider-form__field">
            <legend className="rider-form__label">Availability</legend>
            <div className="rider-seg" role="radiogroup">
              {[
                { v: "available", label: "Available", icon: "bi-circle-fill" },
                { v: "busy", label: "Busy", icon: "bi-dash-circle-fill" },
                { v: "offline", label: "Offline", icon: "bi-moon-fill" },
              ].map((o) => (
                <label key={o.v} className={`rider-seg__opt rider-seg__opt--${o.v}`}>
                  <input
                    type="radio"
                    name="fleet_status"
                    value={o.v}
                    defaultChecked={(rider.fleet_status ?? "available") === o.v}
                  />
                  <span>
                    <i className={`bi ${o.icon}`} aria-hidden="true" /> {o.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn btn-dark rider-form__submit">
            <i className="bi bi-check2 me-1" aria-hidden="true" /> Save profile
          </button>
        </form>
      </section>

      <a href="/rider/logout" className="rider-logout-row">
        <i className="bi bi-box-arrow-right" aria-hidden="true" /> Log out
      </a>
    </RiderPageShell>
  );
}
