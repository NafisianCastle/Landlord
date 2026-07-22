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
    .select("user_id, amount")
    .eq("tran_id", tranId)
    .single();

  if (!txn) {
    return NextResponse.json({ error: "unknown transaction" }, { status: 404 });
  }

  const validation = await validateSslcommerzPayment(valId);
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";
  const amountMatches = Number(validation.amount) >= Number(txn.amount) - 0.01;
  const succeeded = isValid && amountMatches;

  await admin
    .from("payment_transactions")
    .update({
      val_id: valId,
      bank_tran_id: validation.bank_tran_id ?? null,
      card_type: validation.card_type ?? null,
      status: succeeded ? "completed" : "failed",
      raw_ipn_payload: payload,
    })
    .eq("tran_id", tranId);

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
