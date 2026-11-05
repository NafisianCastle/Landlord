// Creates (or resets) the shared read-only demo account and its sample data.
// The same reset runs nightly via app/api/cron/demo-reset.
//
// Run with: npm run seed:demo
// Requires DEMO_USER_EMAIL, DEMO_USER_PASSWORD, NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in .env.local — pass --env-file=.env.local (see
// package.json script) since this runs outside Next's own env loading.

import { createClient } from "@supabase/supabase-js";
import { seedDemoAccount } from "../lib/demoSeed.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_USER_EMAIL;
const password = process.env.DEMO_USER_PASSWORD;

if (!url || !serviceRoleKey || !email || !password) {
  console.error(
    "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_USER_EMAIL, DEMO_USER_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

seedDemoAccount(supabase, { email, password }).catch((error) => {
  console.error(error);
  process.exit(1);
});
