import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";

// Server-to-server webhook from SSLCommerz. The IPN payload itself is never
// trusted — val_id is re-checked against SSLCommerz's validation API before
// any subscription is marked active. This is the sole source of truth for
// completing a payment; the success-redirect route is UX only.
export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData.entries());
  const valId = String(payload.val_id ?? "");
  const tranId = String(payload.tran_id ?? "");

  if (!valId || !tranId) {
    return NextResponse.json({ error: "missing val_id/tran_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: txn } = await admin
    .from("payment_transactions")
    .select("user_id, amount, status")
    .eq("tran_id", tranId)
    .single();

  if (!txn) {
    return NextResponse.json({ error: "unknown transaction" }, { status: 404 });
  }

  // Already resolved — treat as a no-op so a duplicate/replayed IPN can't
  // flip a completed transaction back to failed or re-run the upsert below.
  if (txn.status !== "pending") {
    return NextResponse.json({ received: true });
  }

  const validation = await validateSslcommerzPayment(valId);
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";
  const amountMatches = Number(validation.amount) >= Number(txn.amount) - 0.01;
  // val_id is bound to the specific tran_id it validated — without this a
  // val_id from one real payment could be replayed against any other
  // account's pending tran_id to fabricate a paid subscription for them too.
  const tranIdMatches = String(validation.tran_id ?? "") === tranId;
  const succeeded = isValid && amountMatches && tranIdMatches;

  const { error: updateError } = await admin
    .from("payment_transactions")
    .update({
      val_id: valId,
      bank_tran_id: validation.bank_tran_id ?? null,
      card_type: validation.card_type ?? null,
      status: succeeded ? "completed" : "failed",
      raw_ipn_payload: payload,
    })
    .eq("tran_id", tranId)
    .eq("status", "pending");

  // val_id is unique across transactions (migration 0011) — a conflict here
  // means this val_id was already consumed by a different tran_id, so refuse
  // to grant access even though SSLCommerz reported it as valid.
  if (updateError) {
    return NextResponse.json({ error: "val_id already used" }, { status: 409 });
  }

  if (succeeded) {
    await admin.from("subscriptions").upsert(
      {
        user_id: txn.user_id,
        plan_type: "lifetime",
        amount_paid: txn.amount,
        currency: "BDT",
        sslcommerz_val_id: valId,
        sslcommerz_tran_id: tranId,
        status: "completed",
        paid_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return NextResponse.json({ received: true });
}
