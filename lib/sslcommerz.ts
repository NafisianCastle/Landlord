const SSLCOMMERZ_BASE =
  process.env.SSLCOMMERZ_IS_SANDBOX === "false"
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";

// Placeholder — set the real one-time lifetime price before going live.
export const LIFETIME_PRICE_BDT = Number(process.env.LIFETIME_PRICE_BDT ?? 2000);

interface InitSessionParams {
  tranId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export async function createSslcommerzSession(params: InitSessionParams): Promise<string> {
  const body = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID!,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
    total_amount: String(params.amount),
    currency: "BDT",
    tran_id: params.tranId,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    cus_name: params.customerName,
    cus_email: params.customerEmail,
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: "N/A",
    shipping_method: "NO",
    product_name: "Landlord Lifetime Subscription",
    product_category: "Service",
    product_profile: "general",
  });

  const res = await fetch(`${SSLCOMMERZ_BASE}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(data.failedreason || "Failed to initiate SSLCommerz session");
  }
  return data.GatewayPageURL as string;
}

export async function validateSslcommerzPayment(valId: string) {
  const params = new URLSearchParams({
    val_id: valId,
    store_id: process.env.SSLCOMMERZ_STORE_ID!,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
    format: "json",
  });
  const res = await fetch(
    `${SSLCOMMERZ_BASE}/validator/api/validationserverAPI.php?${params}`,
  );
  return res.json();
}
