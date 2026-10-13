import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_CART,
  COOKIE_CHECKOUT_PREFILL,
  cartItemCount,
  parseCartJson,
  type CheckoutPrefill,
} from "@/lib/cart-cookies";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/lib/customer-profile";
import {
  BARANGAY_DISTANCES,
  isDeliveryOption,
  isPaymentOption,
  type PaymentOption,
} from "@/lib/checkout";
import { CheckoutForm, type CheckoutInitial } from "@/components/store/checkout-form";

const ERRORS: Record<string, string> = {
  address: "Please enter your street or landmark for delivery.",
  location: "Please choose a barangay from the list (Pototan, Iloilo only).",
  schedule: "Please choose a valid date and time for scheduled delivery.",
  items: "Some items in your cart are no longer available. Please review your cart.",
  config: "Ordering is temporarily unavailable. Please try again later.",
  failed: "We couldn't place your order. Please try again.",
};

type Search = Promise<{ error?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: Search }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/cart?login=required");

  const cookieStore = await cookies();
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  if (cartItemCount(cart) === 0) redirect("/cart");

  let pf: CheckoutPrefill = {};
  try {
    const raw = cookieStore.get(COOKIE_CHECKOUT_PREFILL)?.value;
    if (raw) pf = JSON.parse(raw) as CheckoutPrefill;
  } catch {
    pf = {};
  }

  let payment: PaymentOption = "cod";
  if (pf.payment && isPaymentOption(pf.payment)) {
    payment = pf.payment;
  } else {
    const profile = await getCustomerProfile(supabase, user.id);
    if (profile.preferred_payment && isPaymentOption(profile.preferred_payment)) {
      payment = profile.preferred_payment;
    }
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const fulfillment = pf.fulfillment === "pickup" ? "pickup" : "delivery";
  const barangay = (pf.barangay ?? "").trim();

  const initial: CheckoutInitial = {
    fulfillment,
    barangay: Object.prototype.hasOwnProperty.call(BARANGAY_DISTANCES, barangay) ? barangay : "",
    address: (pf.address ?? "").trim(),
    time: /^\d{2}:\d{2}/.test(pf.time ?? "") ? pf.time!.slice(0, 5) : "12:00",
    notes: (pf.notes ?? "").trim(),
    deliveryOption: pf.delivery_option && isDeliveryOption(pf.delivery_option) ? pf.delivery_option : "standard",
    payment,
    scheduleDate: /^\d{4}-\d{2}-\d{2}$/.test(pf.schedule_date ?? "") ? pf.schedule_date! : today,
    scheduleTime: /^\d{2}:\d{2}/.test(pf.schedule_time ?? "") ? pf.schedule_time!.slice(0, 5) : "12:00",
    fromPrefill: Object.keys(pf).length > 0,
  };

  const lines = Object.values(cart).map((l) => ({
    menu_id: Number(l.menu_id),
    name: String(l.name),
    price: Number(l.price),
    qty: Number(l.qty),
  }));

  const sp = await searchParams;
  const errorMessage = sp.error ? ERRORS[sp.error] ?? ERRORS.failed : null;

  return (
    <main className="checkout-page">
      <div className="container checkout-page__inner">
        <header className="checkout-page__intro">
          <Link href="/cart" className="small text-decoration-none">
            ← Back to cart
          </Link>
          <p className="checkout-page__kicker">Almost there</p>
          <h1 className="checkout-page__title">Checkout</h1>
          <p className="checkout-page__lede">Confirm your order and delivery details.</p>
        </header>

        {errorMessage ? (
          <div className="alert alert-warning" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <CheckoutForm lines={lines} initial={initial} today={today} />
      </div>
    </main>
  );
}
