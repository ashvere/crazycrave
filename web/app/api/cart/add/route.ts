import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  CART_COOKIE_OPTS as cookieOpts,
  COOKIE_CART,
  COOKIE_CART_SHOP,
  COOKIE_CHECKOUT_PREFILL,
  MAX_LINE_QTY,
  parseCartJson,
  safeCartReturnTo,
  type CheckoutPrefill,
} from "@/lib/cart-cookies";

/** 303 so the browser follows a POST with a GET. */
const go = (path: string | URL, request: Request) =>
  NextResponse.redirect(new URL(path, request.url), 303);

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* session refresh not needed for this POST */
      },
    },
  });

  // Guests may build a cart; login is required at checkout (prices are re-checked there).
  const form = await request.formData();
  const menuIdRaw = form.get("menu_id");
  const menuId = Number(menuIdRaw);
  const returnTo = form.get("return_to") ? safeCartReturnTo(form.get("return_to")) : null;
  if (!menuIdRaw || !Number.isFinite(menuId) || menuId <= 0) {
    return go("/", request);
  }

  const { data: menu, error } = await supabase
    .from("menus")
    .select("id, restaurant_id, name, price, image, is_active")
    .eq("id", menuId)
    .maybeSingle();

  if (error || !menu || !menu.is_active) {
    return go(returnTo ?? "/", request);
  }

  const shopId = Number(menu.restaurant_id);
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  const existingShop = cookieStore.get(COOKIE_CART_SHOP)?.value;
  const existingShopId = existingShop ? parseInt(existingShop, 10) : null;

  if (
    existingShopId != null &&
    Number.isFinite(existingShopId) &&
    existingShopId !== shopId &&
    Object.keys(cart).length > 0
  ) {
    const u = new URL("/restaurant", request.url);
    u.searchParams.set("id", String(shopId));
    u.searchParams.set("error", "different_shop");
    return go(u, request);
  }

  // How many to add (the menu pop-up has a − / + stepper); defaults to one.
  const addQtyRaw = Math.floor(Number(form.get("qty") ?? 1));
  const addQty = Number.isFinite(addQtyRaw) ? Math.min(Math.max(addQtyRaw, 1), MAX_LINE_QTY) : 1;

  const keyStr = String(menuId);
  if (cart[keyStr]) {
    cart[keyStr] = {
      ...cart[keyStr],
      qty: Math.min(cart[keyStr].qty + addQty, MAX_LINE_QTY),
    };
  } else {
    cart[keyStr] = {
      menu_id: menuId,
      name: String(menu.name ?? ""),
      price: Number(menu.price),
      image: String(menu.image ?? ""),
      qty: addQty,
    };
  }

  const prefillFlow = String(form.get("prefill_flow") ?? "");
  let prefillCookie: string | undefined;
  if (prefillFlow === "order_now") {
    let ful = String(form.get("prefill_fulfillment") ?? "delivery");
    if (ful !== "pickup") ful = "delivery";
    let pay = String(form.get("prefill_payment") ?? "cod");
    if (!["cod", "gcash", "bank", "card"].includes(pay)) pay = "cod";
    let dOpt = String(form.get("prefill_delivery_option") ?? "standard");
    if (!["standard", "priority", "scheduled"].includes(dOpt)) dOpt = "standard";

    const prefill: CheckoutPrefill = {
      fulfillment: ful,
      barangay: String(form.get("prefill_barangay") ?? "").trim(),
      delivery_option: dOpt,
      distance_km: String(form.get("prefill_distance_km") ?? "").trim(),
      rider_fee: String(form.get("prefill_rider_fee") ?? "").trim(),
      address: String(form.get("prefill_address") ?? "").trim(),
      time: String(form.get("prefill_time") ?? "").trim(),
      payment: pay,
      notes: String(form.get("prefill_notes") ?? "").trim(),
      schedule_date: String(form.get("prefill_schedule_date") ?? "").trim(),
      schedule_time: String(form.get("prefill_schedule_time") ?? "").trim(),
    };
    prefillCookie = JSON.stringify(prefill);
  }

  // From a shop page: stay there (cart bar shows the update); otherwise open the cart.
  let dest = new URL("/cart", request.url);
  if (returnTo) {
    dest = new URL(returnTo, request.url);
    if (dest.pathname === "/restaurant") {
      dest.searchParams.set("added", String(menuId));
      dest.searchParams.delete("error");
      dest.hash = `menu-${menuId}`;
    }
  }
  const res = go(dest, request);
  res.cookies.set(COOKIE_CART, JSON.stringify(cart), cookieOpts);
  res.cookies.set(COOKIE_CART_SHOP, String(shopId), cookieOpts);
  if (prefillCookie) {
    res.cookies.set(COOKIE_CHECKOUT_PREFILL, prefillCookie, cookieOpts);
  }

  return res;
}
