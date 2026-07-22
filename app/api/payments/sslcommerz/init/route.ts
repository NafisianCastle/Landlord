import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSslcommerzSession, LIFETIME_PRICE_BDT } from "@/lib/sslcommerz";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const origin = new URL(request.url).origin;

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const tranId = crypto.randomUUID();
  const admin = createAdminClient();
  await admin.from("payment_transactions").insert({
    user_id: user.id,
    tran_id: tranId,
    amount: LIFETIME_PRICE_BDT,
    status: "pending",
  });

  try {
    const gatewayUrl = await createSslcommerzSession({
      tranId,
      amount: LIFETIME_PRICE_BDT,
      customerEmail: user.email ?? "unknown@landlord.app",
      customerName:
        (user.user_metadata as { full_name?: string } | null)?.full_name ?? "Landlord user",
      successUrl: `${origin}/api/payments/sslcommerz/success`,
      failUrl: `${origin}/paywall?status=failed`,
      cancelUrl: `${origin}/paywall?status=cancelled`,
      ipnUrl: `${origin}/api/payments/sslcommerz/ipn`,
    });
    return NextResponse.redirect(gatewayUrl);
  } catch {
    return NextResponse.redirect(new URL("/paywall?status=error", origin));
  }
}
