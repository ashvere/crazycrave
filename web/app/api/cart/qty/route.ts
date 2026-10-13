import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CART_COOKIE_OPTS,
  COOKIE_CART,
  COOKIE_CART_SHOP,
  COOKIE_CHECKOUT_PREFILL,
  MAX_LINE_QTY,
  parseCartJson,
  safeCartReturnTo,
} from "@/lib/cart-cookies";

/** Increase / decrease one cart line (removes it at zero). Form fields: menu_id, op=inc|dec, return_to. */
export async function POST(request: Request) {
  const form = await request.formData();
  const menuId = parseInt(String(form.get("menu_id") ?? ""), 10);
  const op = String(form.get("op") ?? "");
  const returnTo = safeCartReturnTo(form.get("return_to"));

  const dest = new URL(returnTo, request.url);
  if (dest.pathname === "/restaurant" && Number.isFinite(menuId)) dest.hash = `menu-${menuId}`;
  const res = NextResponse.redirect(dest, 303);

  const cookieStore = await cookies();
  const cart = parseCartJson(cookieStore.get(COOKIE_CART)?.value);
  const key = String(menuId);
  if (!Number.isFinite(menuId) || !cart[key] || (op !== "inc" && op !== "dec")) return res;

  const qty = cart[key].qty + (op === "inc" ? 1 : -1);
  if (qty <= 0) delete cart[key];
  else cart[key] = { ...cart[key], qty: Math.min(qty, MAX_LINE_QTY) };

  res.cookies.set(COOKIE_CART, JSON.stringify(cart), CART_COOKIE_OPTS);
  if (Object.keys(cart).length === 0) {
    res.cookies.delete(COOKIE_CART_SHOP);
    res.cookies.delete(COOKIE_CHECKOUT_PREFILL);
  }
  return res;
}
