const BKASH_BASE =
  process.env.BKASH_IS_SANDBOX === "false"
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";

interface GrantTokenResponse {
  id_token?: string;
  statusCode?: string;
  statusMessage?: string;
}

async function grantBkashToken(): Promise<string> {
  const res = await fetch(`${BKASH_BASE}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: process.env.BKASH_USERNAME!,
      password: process.env.BKASH_PASSWORD!,
    },
    body: JSON.stringify({
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
  });
  const data: GrantTokenResponse = await res.json();
  if (!data.id_token) {
    throw new Error(data.statusMessage || "Failed to grant bKash token");
  }
  return data.id_token;
}

interface CreatePaymentParams {
  tranId: string;
  amount: number;
  callbackURL: string;
}

interface CreatePaymentResponse {
  paymentID?: string;
  bkashURL?: string;
  statusCode?: string;
  statusMessage?: string;
}

export async function createBkashPayment(
  params: CreatePaymentParams,
): Promise<{ paymentID: string; bkashURL: string }> {
  const idToken = await grantBkashToken();
  const res = await fetch(`${BKASH_BASE}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-APP-Key": process.env.BKASH_APP_KEY!,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: params.tranId,
      callbackURL: params.callbackURL,
      amount: String(params.amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: params.tranId,
    }),
  });
  const data: CreatePaymentResponse = await res.json();
  if (!data.paymentID || !data.bkashURL) {
    throw new Error(data.statusMessage || "Failed to create bKash payment");
  }
  return { paymentID: data.paymentID, bkashURL: data.bkashURL };
}

export interface ExecutePaymentResponse {
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string;
  merchantInvoiceNumber?: string;
  statusCode?: string;
  statusMessage?: string;
}

export async function executeBkashPayment(paymentID: string): Promise<ExecutePaymentResponse> {
  const idToken = await grantBkashToken();
  const res = await fetch(`${BKASH_BASE}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-APP-Key": process.env.BKASH_APP_KEY!,
    },
    body: JSON.stringify({ paymentID }),
  });
  return res.json();
}
