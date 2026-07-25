import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBkashPayment } from "@/lib/bkash";
import { LIFETIME_PRICE_BDT } from "@/lib/sslcommerz";

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
    provider: "bkash",
  });

  try {
    const { paymentID, bkashURL } = await createBkashPayment({
      tranId,
      amount: LIFETIME_PRICE_BDT,
      callbackURL: `${origin}/api/payments/bkash/callback`,
    });
    await admin.from("payment_transactions").update({ bkash_payment_id: paymentID }).eq(
      "tran_id",
      tranId,
    );
    return NextResponse.redirect(bkashURL);
  } catch {
    return NextResponse.redirect(new URL("/paywall?status=error", origin));
  }
}
