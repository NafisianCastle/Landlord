import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/webPush";
import { getRentReminderPublicKey } from "@/lib/pushConfig";

const bdt = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

// Vercel Cron (see vercel.json) hits this daily. Reminds once per payment row:
// anything unpaid, due within the next 3 days or already overdue, that hasn't
// been reminded yet. No SMS/email gateway configured, so push is the only
// channel — reaches the landlord's own devices, not the tenant.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getRentReminderPublicKey()) {
    return NextResponse.json(
      { error: "Push notifications are not configured" },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 3);
  const horizonDate = horizon.toISOString().slice(0, 10);

  const { data: duePayments, error } = await admin
    .from("lease_payments")
    .select(
      "id, user_id, due_date, amount, leases!inner(tenant_name, apartment_id, plot_id)",
    )
    .eq("paid", false)
    .is("reminder_sent_at", null)
    .lte("due_date", horizonDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!duePayments || duePayments.length === 0) {
    return NextResponse.json({ sent: 0, expiredSubscriptionsRemoved: 0 });
  }

  const userIds = [...new Set(duePayments.map((p) => p.user_id))];
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const subsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions ?? []) {
    subsByUser.set(sub.user_id, [...(subsByUser.get(sub.user_id) ?? []), sub]);
  }

  let sent = 0;
  const remindedIds: string[] = [];
  const expiredEndpoints: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const payment of duePayments) {
    const userSubs = subsByUser.get(payment.user_id);
    if (!userSubs || userSubs.length === 0) continue;

    const lease = Array.isArray(payment.leases)
      ? payment.leases[0]
      : payment.leases;
    const overdue = payment.due_date < today;
    const title = overdue ? "Rent overdue" : "Rent due soon";
    const body = `${lease?.tenant_name ?? "Tenant"} · ${bdt.format(payment.amount)} · due ${payment.due_date}`;

    const results = await Promise.all(
      userSubs.map((sub) => sendPush(sub, { title, body, url: "/leases" })),
    );
    if (results.some((r) => r.sent)) {
      sent += 1;
      remindedIds.push(payment.id);
    }
    for (const r of results) {
      if (r.expired) expiredEndpoints.push(r.endpoint);
    }
  }

  if (remindedIds.length > 0) {
    await admin
      .from("lease_payments")
      .update({ reminder_sent_at: new Date().toISOString() })
      .in("id", remindedIds);
  }
  if (expiredEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    sent,
    expiredSubscriptionsRemoved: expiredEndpoints.length,
  });
}
