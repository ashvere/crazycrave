import Link from "next/link";
import {
  profileUpdateAccount,
  profileUpdatePassword,
} from "@/app/(store)/profile/actions";
import type { CustomerProfileRow } from "@/lib/customer-profile";
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
            Update your account details and password.
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
