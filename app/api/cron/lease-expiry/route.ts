import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/webPush";
import { sendFcm, leasePropertyPath } from "@/lib/fcm";
import { remindersConfigured } from "@/lib/pushConfig";

// Vercel Cron (see vercel.json) hits this daily. Reminds once per lease:
// active, end_date within the next 14 days, not yet reminded.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!remindersConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured" },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const horizonDate = horizon.toISOString().slice(0, 10);

  const { data: expiringLeases, error } = await admin
    .from("leases")
    .select("id, user_id, tenant_name, end_date, plot_id, apartment_id")
    .eq("status", "active")
    .is("expiry_reminder_sent_at", null)
    .not("end_date", "is", null)
    .lte("end_date", horizonDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!expiringLeases || expiringLeases.length === 0) {
    return NextResponse.json({ sent: 0, expiredSubscriptionsRemoved: 0 });
  }

  const userIds = [...new Set(expiringLeases.map((l) => l.user_id))];
  const [{ data: subscriptions }, { data: deviceTokens }] = await Promise.all([
    admin
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", userIds),
    admin.from("device_push_tokens").select("user_id, token").in("user_id", userIds),
  ]);

  const subsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions ?? []) {
    subsByUser.set(sub.user_id, [...(subsByUser.get(sub.user_id) ?? []), sub]);
  }
  const tokensByUser = new Map<string, string[]>();
  for (const row of deviceTokens ?? []) {
    tokensByUser.set(row.user_id, [...(tokensByUser.get(row.user_id) ?? []), row.token]);
  }

  let sent = 0;
  const remindedIds: string[] = [];
  const expiredEndpoints: string[] = [];
  const expiredTokens: string[] = [];

  for (const lease of expiringLeases) {
    const userSubs = subsByUser.get(lease.user_id) ?? [];
    const userTokens = tokensByUser.get(lease.user_id) ?? [];
    if (userSubs.length === 0 && userTokens.length === 0) continue;

    const title = "Lease ending soon";
    const body = `${lease.tenant_name}'s lease ends ${lease.end_date} — renew or close it out.`;
    const [results, fcmResults] = await Promise.all([
      Promise.all(userSubs.map((sub) => sendPush(sub, { title, body, url: "/leases" }))),
      Promise.all(
        userTokens.map((token) =>
          sendFcm(token, { title, body, url: leasePropertyPath(lease) }),
        ),
      ),
    ]);
    if ([...results, ...fcmResults].some((r) => r.sent)) {
      sent += 1;
      remindedIds.push(lease.id);
    }
    for (const r of results) {
      if (r.expired) expiredEndpoints.push(r.endpoint);
    }
    for (const r of fcmResults) {
      if (r.expired) expiredTokens.push(r.token);
    }
  }

  if (remindedIds.length > 0) {
    await admin
      .from("leases")
      .update({ expiry_reminder_sent_at: new Date().toISOString() })
      .in("id", remindedIds);
  }
  if (expiredEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }
  if (expiredTokens.length > 0) {
    await admin.from("device_push_tokens").delete().in("token", expiredTokens);
  }

  return NextResponse.json({
    sent,
    expiredSubscriptionsRemoved: expiredEndpoints.length + expiredTokens.length,
  });
}
