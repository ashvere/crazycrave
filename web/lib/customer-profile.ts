import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerProfileRow = {
  user_id: string;
  phone: string | null;
  gcash_number: string | null;
  gcash_account_name: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  card_holder_name: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  preferred_payment: string | null;
};

const empty = (userId: string): CustomerProfileRow => ({
  user_id: userId,
  phone: null,
  gcash_number: null,
  gcash_account_name: null,
  bank_name: null,
  bank_account_name: null,
  bank_account_number: null,
  card_holder_name: null,
  card_last4: null,
  card_brand: null,
  card_exp_month: null,
  card_exp_year: null,
  preferred_payment: null,
});

export async function getCustomerProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CustomerProfileRow> {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return empty(userId);
  }

  return data as CustomerProfileRow;
}

export function maskAccountNumber(number: string | null | undefined): string {
  const n = String(number ?? "").replace(/\D/g, "");
  if (n === "") return "";
  if (n.length <= 4) return n;
  return "•".repeat(Math.max(4, n.length - 4)) + n.slice(-4);
}

/** PH mobile as 09XXXXXXXXX (accepts +63 / 63 / 9XXXXXXXXX), or null if not a mobile number. */
export function normalizePhMobile(raw: string): string | null {
  let d = raw.replace(/[\s\-().+]/g, "");
  if (/^63\d{10}$/.test(d)) d = `0${d.slice(2)}`;
  else if (/^9\d{9}$/.test(d)) d = `0${d}`;
  return /^09\d{9}$/.test(d) ? d : null;
}

/** Luhn checksum — catches mistyped card numbers. */
export function isValidCardNumber(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function cardBrandFromNumber(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d === "") return "";
  if (d[0] === "4") return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  return "Card";
}
