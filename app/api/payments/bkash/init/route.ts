import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBkashPayment } from "@/lib/bkash";
import { getAppSettings } from "@/lib/settings";
import { validateCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const origin = new URL(request.url).origin;

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const formData = await request.formData();
  const couponCode = formData.get("couponCode")?.toString() || null;

  const { lifetimePriceBdt } = await getAppSettings();
  const coupon = await validateCoupon(couponCode, user.id, lifetimePriceBdt);
  const amount = "error" in coupon ? lifetimePriceBdt : coupon.finalAmount;

  const tranId = crypto.randomUUID();
  const admin = createAdminClient();
  await admin.from("payment_transactions").insert({
    user_id: user.id,
    tran_id: tranId,
    amount,
    status: "pending",
    provider: "bkash",
    coupon_code: "error" in coupon ? null : coupon.code,
    discount_amount: "error" in coupon ? 0 : coupon.discountAmount,
  });

  try {
    const { paymentID, bkashURL } = await createBkashPayment({
      tranId,
      amount,
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
