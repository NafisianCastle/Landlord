import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRentReminderPublicKey } from "@/lib/pushConfig";
import { parsePushSubscription } from "@/lib/pushEndpoint";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getRentReminderPublicKey()) {
    return NextResponse.json(
      { error: "Push notifications are not configured" },
      { status: 503 },
    );
  }

  const subscription = parsePushSubscription(await request.json().catch(() => null));
  if (!subscription) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, ...subscription }, { onConflict: "endpoint" });

  if (error) {
    // Database errors (including the per-account limit) stay server-side.
    console.error("push subscribe failed:", error.message);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const endpoint = (body as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || !endpoint || endpoint.length > 1000) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("push unsubscribe failed:", error.message);
    return NextResponse.json({ error: "Could not remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
