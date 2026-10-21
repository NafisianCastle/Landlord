import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRentReminderPublicKey } from "@/lib/pushConfig";
import { sendPush } from "@/lib/webPush";
import { billHorizon } from "@/lib/bills";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getRentReminderPublicKey()) return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 });
  const admin = createAdminClient();
  let cursor: string | undefined;
  let sent = 0;
  let expiredSubscriptionsRemoved = 0;
  // Keyset pagination prevents unsubscribed early rows starving later tenants.
  for (;;) {
    let query = admin.from("apartment_bills")
      .select("id, tenant_share_id, tenant:apartment_tenants!apartment_bills_tenant_share_id_fkey!inner(user_id)")
      .eq("visible_to_tenant", true).is("paid_at", null).is("reminder_sent_at", null)
      .not("storage_path", "is", null).lte("due_date", billHorizon()).order("id").limit(100);
    if (cursor) query = query.gt("id", cursor);
    const { data: bills, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load bills" }, { status: 500 });
    if (!bills?.length) break;
    for (const bill of bills) {
      const tenant = Array.isArray(bill.tenant) ? bill.tenant[0] : bill.tenant;
      if (!tenant) continue;
      const { data: subscriptions, error: subscriptionError } = await admin.from("push_subscriptions")
        .select("endpoint, p256dh, auth").eq("user_id", tenant.user_id);
      if (subscriptionError) return NextResponse.json({ error: "Could not load subscriptions" }, { status: 500 });
      if (!subscriptions?.length) continue;
      // Check again just before delivery: the owner may have hidden/paid/revoked it.
      const { data: current, error: currentError } = await admin.from("apartment_bills")
        .select("id").eq("id", bill.id).eq("tenant_share_id", bill.tenant_share_id)
        .eq("visible_to_tenant", true).is("paid_at", null).is("reminder_sent_at", null).maybeSingle();
      if (currentError) return NextResponse.json({ error: "Could not verify bill" }, { status: 500 });
      if (!current) continue;
      const results = await Promise.all(subscriptions.map(sub => sendPush(sub, {
        title: "Utility bill due",
        body: "You have a bill due soon or overdue. Open Landlord to review it.",
        url: `/bills#bill-${bill.id}`,
      })));
      const expired = results.filter(r => r.expired).map(r => r.endpoint);
      if (expired.length) {
        const { error: removeError } = await admin.from("push_subscriptions").delete().in("endpoint", expired);
        if (removeError) return NextResponse.json({ error: "Could not remove expired subscriptions" }, { status: 500 });
        expiredSubscriptionsRemoved += expired.length;
      }
      if (results.some(r => r.sent)) {
        const { error: updateError } = await admin.from("apartment_bills")
          .update({ reminder_sent_at: new Date().toISOString() }).eq("id", bill.id);
        if (updateError) return NextResponse.json({ error: "Could not save delivery status" }, { status: 500 });
        sent++;
      }
    }
    cursor = bills[bills.length - 1].id;
    if (bills.length < 100) break;
  }
  return NextResponse.json({ sent, expiredSubscriptionsRemoved });
}
