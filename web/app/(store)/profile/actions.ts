"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  cardBrandFromNumber,
  getCustomerProfile,
  isValidCardNumber,
  normalizePhMobile,
} from "@/lib/customer-profile";

function fail(message: string): never {
  redirect("/profile?error=" + encodeURIComponent(message));
}

/** Person/account names: no digits, sensible length. */
function checkName(value: string, label: string, max: number) {
  if (/\d/.test(value)) fail(`${label} can't contain numbers.`);
  if (value.length > max) fail(`${label} is too long (max ${max} characters).`);
}

export async function profileUpdateAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  if (name === "") fail("Name cannot be empty.");
  checkName(name, "Name", 120);

  const phone = phoneRaw === "" ? "" : normalizePhMobile(phoneRaw);
  if (phone === null) {
    fail("Phone must be an 11-digit mobile number starting with 09 (numbers only), e.g. 09171234567.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  const { error: e1 } = await supabase
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (e1) {
    redirect("/profile?error=" + encodeURIComponent(e1.message));
  }

  const row = await getCustomerProfile(supabase, user.id);
  const { error: e2 } = await supabase.from("customer_profiles").upsert(
    {
      ...row,
      user_id: user.id,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (e2) {
    redirect("/profile?error=" + encodeURIComponent(e2.message));
  }

  revalidatePath("/profile");
  redirect("/profile?saved=account");
}

export async function profileUpdatePayments(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  const existing = await getCustomerProfile(supabase, user.id);

  const gcashRaw = String(formData.get("gcash_number") ?? "").trim();
  const gcashNumber = gcashRaw === "" ? "" : normalizePhMobile(gcashRaw);
  if (gcashNumber === null) {
    fail("GCash number must be an 11-digit mobile number starting with 09 (numbers only).");
  }
  const gcashName = String(formData.get("gcash_account_name") ?? "").trim();
  checkName(gcashName, "GCash account name", 100);

  const bankName = String(formData.get("bank_name") ?? "").trim();
  if (bankName.length > 60) fail("Bank name is too long (max 60 characters).");
  const bankAccName = String(formData.get("bank_account_name") ?? "").trim();
  checkName(bankAccName, "Bank account name", 100);
  let bankAccNumber = String(formData.get("bank_account_number") ?? "").trim();
  if (bankAccNumber === "") {
    bankAccNumber = existing.bank_account_number ?? "";
  } else if (!/^\d{8,20}$/.test(bankAccNumber)) {
    fail("Bank account number must be 8 to 20 digits (numbers only).");
  }

  const cardHolder = String(formData.get("card_holder_name") ?? "").trim();
  checkName(cardHolder, "Name on card", 100);
  const cardRaw = String(formData.get("card_number") ?? "").trim();
  let cardLast4 = existing.card_last4;
  let cardBrand = existing.card_brand;
  if (cardRaw !== "") {
    if (!/^\d+$/.test(cardRaw)) fail("Card number must contain numbers only.");
    if (!isValidCardNumber(cardRaw)) fail("That card number isn't valid. Please check the digits.");
    cardLast4 = cardRaw.slice(-4);
    cardBrand = cardBrandFromNumber(cardRaw);
  }

  let expMonth = existing.card_exp_month;
  let expYear = existing.card_exp_year;
  const em = String(formData.get("card_exp_month") ?? "").trim();
  const ey = String(formData.get("card_exp_year") ?? "").trim();
  if (em !== "") {
    if (!/^\d{1,2}$/.test(em) || Number(em) < 1 || Number(em) > 12) {
      fail("Expiry month must be a number from 1 to 12.");
    }
    expMonth = Number(em);
  }
  if (ey !== "") {
    if (!/^\d{4}$/.test(ey) || Number(ey) > 2099) fail("Expiry year must be 4 digits, e.g. 2028.");
    expYear = Number(ey);
  }
  if (em !== "" || ey !== "") {
    const now = new Date();
    if (
      expMonth != null &&
      expYear != null &&
      (expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1))
    ) {
      fail("That card has already expired.");
    }
  }

  let preferredRaw = String(formData.get("preferred_payment") ?? "").trim();
  if (!["", "cod", "gcash", "bank", "card"].includes(preferredRaw)) {
    preferredRaw = existing.preferred_payment ?? "";
  }
  const preferredPayment: string | null = preferredRaw === "" ? null : preferredRaw;

  const { error } = await supabase.from("customer_profiles").upsert(
    {
      user_id: user.id,
      phone: existing.phone,
      gcash_number: gcashNumber || null,
      gcash_account_name: gcashName || null,
      bank_name: bankName || null,
      bank_account_name: bankAccName || null,
      bank_account_number: bankAccNumber || null,
      card_holder_name: cardHolder || null,
      card_last4: cardLast4 || null,
      card_brand: cardBrand || null,
      card_exp_month: expMonth,
      card_exp_year: expYear,
      preferred_payment: preferredPayment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect("/profile?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/profile");
  redirect("/profile?saved=payments");
}

export async function profileUpdatePassword(formData: FormData) {
  const current = String(formData.get("current_password") ?? "");
  const newPass = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (newPass.length < 6) {
    redirect("/profile?error=" + encodeURIComponent("New password must be at least 6 characters."));
  }
  if (newPass !== confirm) {
    redirect("/profile?error=" + encodeURIComponent("New passwords do not match."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/?login=required");

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signErr) {
    redirect("/profile?error=" + encodeURIComponent("Current password is incorrect."));
  }

  const { error: upErr } = await supabase.auth.updateUser({ password: newPass });
  if (upErr) {
    redirect("/profile?error=" + encodeURIComponent(upErr.message));
  }

  revalidatePath("/profile");
  redirect("/profile?saved=password");
}
