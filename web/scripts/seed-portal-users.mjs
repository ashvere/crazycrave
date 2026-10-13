/**
 * One-time dev seed: platform admin + approved rider in Supabase Auth + profiles.
 *
 * Run from web/ (requires SUPABASE_SERVICE_ROLE_KEY in .env.local):
 *   node --env-file=.env.local scripts/seed-portal-users.mjs
 *
 * Passwords come from SEED_ADMIN_PASSWORD and SEED_RIDER_PASSWORD in .env.local
 * (never commit them). Re-running this resets both accounts to those passwords.
 */

import { createClient } from "@supabase/supabase-js";

const USERS = [
  {
    email: "admin@crispy.com",
    password: process.env.SEED_ADMIN_PASSWORD,
    displayName: "Platform Admin",
    role: "admin",
    approvalStatus: "approved",
    metadata: {},
  },
  {
    email: "rider@crispy.com",
    password: process.env.SEED_RIDER_PASSWORD,
    displayName: "Demo Rider",
    role: "rider",
    approvalStatus: "approved",
    metadata: { signup_role: "rider" },
    riderProfile: {
      phone: "09000000001",
      vehicle_type: "motorcycle",
      vehicle_plate: "DEMO-123",
      fleet_status: "available",
    },
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to web/.env.local (service role: Supabase → Settings → API)."
  );
  process.exit(1);
}

for (const spec of USERS) {
  if (!spec.password || spec.password.length < 12) {
    console.error(
      `Set a password of at least 12 characters for ${spec.email}:
` +
        "  SEED_ADMIN_PASSWORD=... and SEED_RIDER_PASSWORD=... in web/.env.local"
    );
    process.exit(1);
  }
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserIdByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertPortalUser(spec) {
  const email = spec.email.toLowerCase();
  let userId = await findUserIdByEmail(email);

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: spec.password,
      email_confirm: true,
      user_metadata: {
        display_name: spec.displayName,
        ...spec.metadata,
      },
    });
    if (error) throw new Error(`${email} update auth: ${error.message}`);
    console.log(`Updated auth: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: spec.password,
      email_confirm: true,
      user_metadata: {
        display_name: spec.displayName,
        ...spec.metadata,
      },
    });
    if (error || !data.user) {
      throw new Error(`${email} create: ${error?.message ?? "no user"}`);
    }
    userId = data.user.id;
    console.log(`Created auth: ${email}`);
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      display_name: spec.displayName,
      role: spec.role,
      approval_status: spec.approvalStatus,
      restaurant_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileErr) {
    throw new Error(`${email} profile: ${profileErr.message}`);
  }
  console.log(`  → profiles.role = ${spec.role}, approval_status = ${spec.approvalStatus}`);

  if (spec.riderProfile) {
    const { error: rpErr } = await admin.from("rider_profiles").upsert(
      {
        user_id: userId,
        ...spec.riderProfile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (rpErr) {
      throw new Error(`${email} rider_profiles: ${rpErr.message}`);
    }
    console.log(`  → rider_profiles row upserted`);
  }

  return userId;
}

async function main() {
  console.log("Seeding portal users…\n");
  for (const spec of USERS) {
    await upsertPortalUser(spec);
    console.log("");
  }
  console.log("Done.\n");
  console.log("Staff login:  /admin/login  → admin@crispy.com");
  console.log("Rider login:  /rider/login → rider@crispy.com");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
