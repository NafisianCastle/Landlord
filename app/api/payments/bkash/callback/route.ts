import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeBkashPayment } from "@/lib/bkash";
import { recordCouponRedemption } from "@/lib/coupons";

// bKash redirects the user's browser here (GET) after checkout with
// ?paymentID=...&status=success|failure|cancel. The status query param is
// never trusted to grant access — only "success" triggers the Execute
// Payment API call, which is the sole source of truth for completion.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const paymentID = url.searchParams.get("paymentID");
  const status = url.searchParams.get("status");

  if (!paymentID) {
    return NextResponse.redirect(new URL("/paywall?status=error", origin));
  }

  const admin = createAdminClient();
  const { data: txn } = await admin
    .from("payment_transactions")
    .select("tran_id, user_id, amount, status, coupon_code")
    .eq("bkash_payment_id", paymentID)
    .single();

  if (!txn) {
    return NextResponse.redirect(new URL("/paywall?status=error", origin));
  }

  // Already resolved — a duplicate/replayed callback can't flip a completed
  // transaction back to failed or re-run the upsert below.
  if (txn.status !== "pending") {
    return NextResponse.redirect(
      new URL(txn.status === "completed" ? "/dashboard?payment=processing" : "/paywall?status=failed", origin),
    );
  }

  if (status !== "success") {
    await admin
      .from("payment_transactions")
      .update({ status: "failed" })
      .eq("tran_id", txn.tran_id)
      .eq("status", "pending");
    return NextResponse.redirect(
      new URL(status === "cancel" ? "/paywall?status=cancelled" : "/paywall?status=failed", origin),
    );
  }

  const execution = await executeBkashPayment(paymentID);
  const isCompleted = execution.transactionStatus === "Completed";
  const amountMatches = Number(execution.amount) >= Number(txn.amount) - 0.01;
  // merchantInvoiceNumber is bound to the tran_id we generated for this
  // payment — without this check a completed paymentID could in principle
  // be matched to the wrong pending row.
  const tranIdMatches = execution.merchantInvoiceNumber === txn.tran_id;
  const succeeded = isCompleted && amountMatches && tranIdMatches;

  const { error: updateError } = await admin
    .from("payment_transactions")
    .update({
      bkash_trx_id: execution.trxID ?? null,
      status: succeeded ? "completed" : "failed",
      raw_ipn_payload: execution,
    })
    .eq("tran_id", txn.tran_id)
    .eq("status", "pending");

  if (updateError || !succeeded) {
    return NextResponse.redirect(new URL("/paywall?status=failed", origin));
  }

  await admin.from("subscriptions").upsert(
    {
      user_id: txn.user_id,
      plan_type: "lifetime",
      amount_paid: txn.amount,
      currency: "BDT",
      bkash_payment_id: paymentID,
      bkash_trx_id: execution.trxID ?? null,
      status: "completed",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (txn.coupon_code) {
    const { data: coupon } = await admin
      .from("referral_coupons")
      .select("id")
      .eq("code", txn.coupon_code)
      .single();
    if (coupon) await recordCouponRedemption(coupon.id, txn.user_id, txn.tran_id);
  }

  return NextResponse.redirect(new URL("/dashboard?payment=processing", origin));
}
