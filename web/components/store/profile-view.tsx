import Link from "next/link";
import {
  profileUpdateAccount,
  profileUpdatePassword,
  profileUpdatePayments,
} from "@/app/(store)/profile/actions";
import type { CustomerProfileRow } from "@/lib/customer-profile";
import { maskAccountNumber } from "@/lib/customer-profile";
import { DigitsInput } from "@/components/store/digits-input";

type Props = {
  displayName: string;
  email: string;
  memberSince: string;
  customer: CustomerProfileRow;
  flash?: { kind: "success" | "error"; message: string } | null;
};

export function ProfileView({
  displayName,
  email,
  memberSince,
  customer,
  flash,
}: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const hasGcash = Boolean(customer.gcash_number);
  const hasBank = Boolean(customer.bank_account_number);
  const hasCard = Boolean(customer.card_last4);

  return (
    <main className="profile-page">
      <div className="profile-page__inner">
        <header className="profile-page__intro">
          <Link href="/" className="profile-page__back">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            <span>Back</span>
          </Link>
          <p className="profile-page__kicker">Your account</p>
          <h1 className="profile-page__title">Profile</h1>
          <p className="profile-page__lede">
            Update your details and saved payment methods for faster checkout.
          </p>
        </header>

        {flash?.kind === "success" ? (
          <div className="alert alert-success profile-page__alert" role="status">
            {flash.message}
          </div>
        ) : null}
        {flash?.kind === "error" ? (
          <div className="alert alert-danger profile-page__alert" role="alert">
            {flash.message}
          </div>
        ) : null}

        <div className="profile-page__grid">
          <aside className="profile-summary">
            <div className="profile-summary__avatar" aria-hidden="true">
              {initial}
            </div>
            <h2 className="profile-summary__name">{displayName}</h2>
            <p className="profile-summary__email">{email}</p>
            <p className="profile-summary__meta">Member since {memberSince}</p>
            <ul className="profile-summary__badges">
              <li className={hasGcash ? "is-set" : ""}>
                <i className="bi bi-phone" /> GCash
              </li>
              <li className={hasBank ? "is-set" : ""}>
                <i className="bi bi-bank" /> Bank
              </li>
              <li className={hasCard ? "is-set" : ""}>
                <i className="bi bi-credit-card" /> Card
              </li>
            </ul>
          </aside>

          <div className="profile-page__sections">
            <section className="profile-card">
              <h2 className="profile-card__title">Account</h2>
              <form action={profileUpdateAccount} className="profile-form">
                <label className="profile-field">
                  <span className="profile-field__label">Full name</span>
                  <input
                    type="text"
                    name="name"
                    className="profile-field__input"
                    required
                    maxLength={120}
                    pattern="[^0-9]*[^0-9s][^0-9]*"
                    title="Name can't contain numbers."
                    autoComplete="name"
                    defaultValue={displayName}
                  />
                </label>
                <label className="profile-field">
                  <span className="profile-field__label">Email</span>
                  <input
                    type="email"
                    className="profile-field__input"
                    disabled
                    value={email}
                    readOnly
                  />
                  <span className="profile-field__hint">Email cannot be changed here.</span>
                </label>
                <label className="profile-field">
                  <span className="profile-field__label">Phone</span>
                  <DigitsInput
                    type="tel"
                    name="phone"
                    className="profile-field__input"
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="11-digit mobile number starting with 09, e.g. 09171234567"
                    autoComplete="tel"
                    defaultValue={customer.phone ?? ""}
                  />
                  <span className="profile-field__hint">Numbers only, e.g. 09171234567.</span>
                </label>
                <button type="submit" className="profile-btn profile-btn--primary">
                  Save account
                </button>
              </form>
            </section>

            <section className="profile-card">
              <h2 className="profile-card__title">Payment methods</h2>
              <p className="profile-card__lede">
                Saved for your convenience at checkout. Card numbers are never stored in full.
              </p>
              <form action={profileUpdatePayments} className="profile-form">
                <fieldset className="profile-fieldset">
                  <legend className="profile-fieldset__legend">
                    <i className="bi bi-phone" /> GCash
                  </legend>
                  <label className="profile-field">
                    <span className="profile-field__label">GCash number</span>
                    <DigitsInput
                      type="tel"
                      name="gcash_number"
                      className="profile-field__input"
                      placeholder="09XXXXXXXXX"
                      maxLength={11}
                      pattern="09[0-9]{9}"
                      title="11-digit GCash number starting with 09, e.g. 09171234567"
                      defaultValue={customer.gcash_number ?? ""}
                    />
                  </label>
                  <label className="profile-field">
                    <span className="profile-field__label">Account name</span>
                    <input
                      type="text"
                      name="gcash_account_name"
                      className="profile-field__input"
                      maxLength={100}
                      pattern="[^0-9]*"
                      title="Name can't contain numbers."
                      defaultValue={customer.gcash_account_name ?? ""}
                    />
                  </label>
                </fieldset>

                <fieldset className="profile-fieldset">
                  <legend className="profile-fieldset__legend">
                    <i className="bi bi-bank" /> Bank transfer
                  </legend>
                  <label className="profile-field">
                    <span className="profile-field__label">Bank name</span>
                    <input
                      type="text"
                      name="bank_name"
                      className="profile-field__input"
                      placeholder="e.g. BDO, BPI"
                      maxLength={60}
                      defaultValue={customer.bank_name ?? ""}
                    />
                  </label>
                  <label className="profile-field">
                    <span className="profile-field__label">Account name</span>
                    <input
                      type="text"
                      name="bank_account_name"
                      className="profile-field__input"
                      maxLength={100}
                      pattern="[^0-9]*"
                      title="Name can't contain numbers."
                      defaultValue={customer.bank_account_name ?? ""}
                    />
                  </label>
                  <label className="profile-field">
                    <span className="profile-field__label">Account number</span>
                    <DigitsInput
                      name="bank_account_number"
                      className="profile-field__input"
                      maxLength={20}
                      pattern="[0-9]{8,20}"
                      title="Account number: 8 to 20 digits, numbers only."
                      placeholder={
                        customer.bank_account_number
                          ? `Leave blank to keep ${maskAccountNumber(customer.bank_account_number)}`
                          : "Account number"
                      }
                      autoComplete="off"
                    />
                    {customer.bank_account_number ? (
                      <span className="profile-field__hint">
                        Saved: {maskAccountNumber(customer.bank_account_number)}
                      </span>
                    ) : null}
                  </label>
                </fieldset>

                <fieldset className="profile-fieldset">
                  <legend className="profile-fieldset__legend">
                    <i className="bi bi-credit-card" /> Credit / debit card
                  </legend>
                  {customer.card_last4 ? (
                    <p className="profile-saved-card">
                      {customer.card_brand || "Card"} ending in {customer.card_last4}
                      {customer.card_exp_month && customer.card_exp_year
                        ? ` · exp ${customer.card_exp_month}/${customer.card_exp_year}`
                        : null}
                    </p>
                  ) : null}
                  <label className="profile-field">
                    <span className="profile-field__label">Name on card</span>
                    <input
                      type="text"
                      name="card_holder_name"
                      className="profile-field__input"
                      maxLength={100}
                      pattern="[^0-9]*"
                      title="Name can't contain numbers."
                      defaultValue={customer.card_holder_name ?? ""}
                    />
                  </label>
                  <label className="profile-field">
                    <span className="profile-field__label">Card number</span>
                    <DigitsInput
                      name="card_number"
                      className="profile-field__input"
                      placeholder="Enter only to update — we save last 4 digits"
                      autoComplete="cc-number"
                      maxLength={19}
                      pattern="[0-9]{13,19}"
                      title="Card number: 13 to 19 digits, numbers only."
                    />
                  </label>
                  <div className="profile-form__row">
                    <label className="profile-field profile-form__col">
                      <span className="profile-field__label">Exp. month</span>
                      <DigitsInput
                        name="card_exp_month"
                        className="profile-field__input"
                        maxLength={2}
                        pattern="0?[1-9]|1[0-2]"
                        title="Month from 1 to 12."
                        autoComplete="cc-exp-month"
                        placeholder="MM"
                        defaultValue={customer.card_exp_month ?? ""}
                      />
                    </label>
                    <label className="profile-field profile-form__col">
                      <span className="profile-field__label">Exp. year</span>
                      <DigitsInput
                        name="card_exp_year"
                        className="profile-field__input"
                        maxLength={4}
                        pattern="20[0-9]{2}"
                        title="4-digit year, e.g. 2028."
                        autoComplete="cc-exp-year"
                        placeholder="YYYY"
                        defaultValue={customer.card_exp_year ?? ""}
                      />
                    </label>
                  </div>
                  <p className="profile-field__hint profile-field__hint--warn">
                    We never store your full card number or CVV.
                  </p>
                </fieldset>

                <label className="profile-field">
                  <span className="profile-field__label">Preferred checkout payment</span>
                  <select
                    name="preferred_payment"
                    className="profile-field__input"
                    defaultValue={customer.preferred_payment ?? ""}
                  >
                    <option value="">No preference</option>
                    <option value="cod">Cash on delivery</option>
                    <option value="gcash">GCash</option>
                    <option value="bank">Bank transfer</option>
                    <option value="card">Credit / debit card</option>
                  </select>
                </label>

                <button type="submit" className="profile-btn profile-btn--primary">
                  Save payment details
                </button>
              </form>
            </section>

            <section className="profile-card">
              <h2 className="profile-card__title">Change password</h2>
              <form action={profileUpdatePassword} className="profile-form">
                <label className="profile-field">
                  <span className="profile-field__label">Current password</span>
                  <input
                    type="password"
                    name="current_password"
                    className="profile-field__input"
                    required
                    autoComplete="current-password"
                  />
                </label>
                <label className="profile-field">
                  <span className="profile-field__label">New password</span>
                  <input
                    type="password"
                    name="new_password"
                    className="profile-field__input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </label>
                <label className="profile-field">
                  <span className="profile-field__label">Confirm new password</span>
                  <input
                    type="password"
                    name="confirm_password"
                    className="profile-field__input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit" className="profile-btn profile-btn--secondary">
                  Update password
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
