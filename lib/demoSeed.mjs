// Creates (or resets) the shared demo account behind the "Try the live demo"
// button and fills it with realistic sample plots, apartments and leases.
// Shared by `npm run seed:demo` (scripts/seed-demo-user.mjs) and the nightly
// reset cron (app/api/cron/demo-reset). Needs a service-role client: the demo
// is read-only for everyone else.

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase service-role client
 * @param {{ email: string, password: string, log?: (message: string) => void }} options
 */
export async function seedDemoAccount(supabase, { email, password, log = console.log }) {
  async function findUserByEmail(targetEmail) {
    // No admin.getUserByEmail in supabase-js — page through listUsers instead.
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = data.users.find((u) => u.email === targetEmail);
      if (found) return found;
      if (data.users.length < 200) return null;
      page += 1;
    }
  }

  async function getOrCreateDemoUser() {
    const existing = await findUserByEmail(email);
    if (existing) {
      const { error } = await supabase.auth.admin.updateUserById(existing.id, { password });
      if (error) throw error;
      log(`Demo user already exists (${existing.id}), password reset.`);
      return existing.id;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Demo Landlord" },
    });
    if (error) throw error;
    log(`Demo user created (${data.user.id}).`);
    return data.user.id;
  }

  async function clearDemoData(userId) {
    // land_plots/apartments cascade into leases/documents/etc; leases cascade
    // into lease_payments. Vendors and expenses are deleted on their own.
    for (const table of ["land_plots", "apartments", "vendors", "expenses"]) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) throw error;
    }
  }

  async function resetDemoProfile(userId) {
    // Marks the account as the read-only demo (supabase/migrations/
    // *_demo_read_only.sql) and undoes anything a visitor could have set.
    const { error } = await supabase.from("profiles").update({
      is_demo: true,
      full_name: "Demo Landlord",
      encryption_enabled: false,
      dek_salt: null,
      dek_wrapped_by_passphrase: null,
      dek_wrapped_by_passphrase_iv: null,
      recovery_salt: null,
      dek_wrapped_by_recovery: null,
      dek_wrapped_by_recovery_iv: null,
    }).eq("id", userId);
    if (error) throw error;
  }

  async function ensureActiveSubscription(userId) {
    // A completed subscription row makes hasActiveAccess() return true forever,
    // so the demo account never hits the trial-expired paywall.
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_type: "lifetime",
        amount_paid: 0,
        currency: "BDT",
        status: "completed",
        paid_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  }

  async function seedPlotsAndApartments(userId) {
    const { data: plots, error: plotsError } = await supabase
      .from("land_plots")
      .insert([
        {
          user_id: userId,
          name: "Gulshan Riverside Plot",
          village: "Baridhara",
          upazila: "Gulshan",
          district: "Dhaka",
          division: "Dhaka",
          mutation_number: "DH-2291",
          purchase_price: 8500000,
          purchase_date: "2021-03-12",
          current_estimated_value: 11200000,
          notes: "Corner plot, road access on two sides.",
        },
        {
          user_id: userId,
          name: "Savar Highway Plot",
          village: "Ashulia",
          upazila: "Savar",
          district: "Dhaka",
          division: "Dhaka",
          mutation_number: "SV-1187",
          purchase_price: 2100000,
          purchase_date: "2022-08-01",
          current_estimated_value: 2600000,
          notes: "Agricultural land, adjacent to highway extension project.",
        },
      ])
      .select("id, name");
    if (plotsError) throw plotsError;

    const { data: apartments, error: apartmentsError } = await supabase
      .from("apartments")
      .insert([
        {
          user_id: userId,
          name: "Bashundhara 3-Bed Flat",
          division: "Dhaka",
          district: "Dhaka",
          upazila: "Bashundhara R/A",
          floor: "5th",
          unit_number: "B-502",
          building_name: "Green Valley Apartments",
          size: 1450,
          size_unit: "sqft",
          purchase_price: 9800000,
          purchase_date: "2020-06-20",
          current_estimated_value: 12500000,
          notes: "Rented to a family, renewed annually.",
        },
        {
          user_id: userId,
          name: "Mirpur Studio Unit",
          division: "Dhaka",
          district: "Dhaka",
          upazila: "Mirpur",
          floor: "2nd",
          unit_number: "A-204",
          building_name: "Nur Tower",
          size: 650,
          size_unit: "sqft",
          purchase_price: 3200000,
          purchase_date: "2023-01-15",
          current_estimated_value: 3600000,
          notes: "Vacant, listing for a new tenant.",
        },
      ])
      .select("id, name");
    if (apartmentsError) throw apartmentsError;

    return { plots, apartments };
  }

  async function seedLeases(userId, { plots, apartments }) {
    const savarPlot = plots.find((p) => p.name === "Savar Highway Plot");
    const bashundharaFlat = apartments.find((a) => a.name === "Bashundhara 3-Bed Flat");

    const { data: leases, error } = await supabase
      .from("leases")
      .insert([
        {
          user_id: userId,
          plot_id: savarPlot.id,
          tenant_name: "Karim Traders",
          tenant_phone: "01711000001",
          tenant_email: "karim.traders@example.com",
          rent_amount: 25000,
          frequency: "monthly",
          start_date: "2024-01-01",
          status: "active",
          notes: "Used for seasonal storage.",
        },
        {
          user_id: userId,
          apartment_id: bashundharaFlat.id,
          tenant_name: "Farhana Rahman",
          tenant_phone: "01822000002",
          tenant_email: "farhana.rahman@example.com",
          rent_amount: 45000,
          frequency: "monthly",
          start_date: "2023-11-01",
          status: "active",
          notes: "Long-term tenant, pays on the 5th of each month.",
        },
      ])
      .select("id, rent_amount, frequency, start_date");
    if (error) throw error;

    for (const lease of leases) {
      const { error: rpcError } = await supabase.rpc("ensure_lease_payments", {
        p_lease_id: lease.id,
        p_months_ahead: 3,
      });
      if (rpcError) throw rpcError;
    }

    // Mark past due dates as paid so the dashboard shows real payment history
    // instead of everything sitting unpaid.
    const today = new Date().toISOString().slice(0, 10);
    for (const lease of leases) {
      const { data: pastDue, error: pastDueError } = await supabase
        .from("lease_payments")
        .select("id, due_date, amount")
        .eq("lease_id", lease.id)
        .lt("due_date", today)
        .order("due_date", { ascending: true });
      if (pastDueError) throw pastDueError;

      for (const payment of pastDue) {
        await supabase
          .from("lease_payments")
          .update({ paid: true, paid_date: payment.due_date, paid_amount: payment.amount })
          .eq("id", payment.id);
      }
    }
  }

  async function seedMaintenanceRequests(userId, { plots, apartments }) {
    const gulshanPlot = plots.find((p) => p.name === "Gulshan Riverside Plot");
    const mirpurFlat = apartments.find((a) => a.name === "Mirpur Studio Unit");

    const { error } = await supabase.from("maintenance_requests").insert([
      {
        user_id: userId,
        plot_id: gulshanPlot.id,
        title: "Boundary wall crack repair",
        description: "Hairline crack found on the east boundary wall after monsoon.",
        status: "resolved",
        cost: 8000,
        reported_date: "2025-07-10",
        resolved_date: "2025-07-20",
      },
      {
        user_id: userId,
        apartment_id: mirpurFlat.id,
        title: "Kitchen faucet leak",
        description: "Slow leak under the kitchen sink, plumber scheduled.",
        status: "in_progress",
        cost: 1500,
        reported_date: "2026-07-28",
      },
    ]);
    if (error) throw error;
  }

  const userId = await getOrCreateDemoUser();
  await resetDemoProfile(userId);
  await ensureActiveSubscription(userId);
  await clearDemoData(userId);
  const created = await seedPlotsAndApartments(userId);
  await seedLeases(userId, created);
  await seedMaintenanceRequests(userId, created);
  // Sign out every visitor session so sessions can't pile up. Best effort:
  // the database may not allow touching auth.sessions.
  const { error: purgeError } = await supabase.rpc("purge_demo_sessions");
  if (purgeError) log(`Could not purge demo sessions: ${purgeError.message}`);
  log(`Demo account seeded: ${email}`);
  return userId;
}
