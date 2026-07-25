import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const grantOk = { id_token: "id-token-1" };

function mockFetchSequence(...responses: unknown[]) {
  const fetchMock = vi.fn();
  for (const body of responses) {
    fetchMock.mockResolvedValueOnce({ json: async () => body });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("bkash", () => {
  beforeEach(() => {
    vi.stubEnv("BKASH_APP_KEY", "app-key-1");
    vi.stubEnv("BKASH_APP_SECRET", "app-secret-1");
    vi.stubEnv("BKASH_USERNAME", "user-1");
    vi.stubEnv("BKASH_PASSWORD", "pass-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses the sandbox host unless BKASH_IS_SANDBOX is exactly 'false'", async () => {
    vi.stubEnv("BKASH_IS_SANDBOX", "true");
    vi.resetModules();
    const fetchMock = mockFetchSequence(grantOk, {
      paymentID: "pid-1",
      bkashURL: "https://gw/pay",
    });
    const { createBkashPayment } = await import("./bkash");
    await createBkashPayment({ tranId: "tran-1", amount: 2000, callbackURL: "https://x/cb" });
    expect(fetchMock.mock.calls[0][0]).toContain("https://tokenized.sandbox.bka.sh");
  });

  it("uses the live host when BKASH_IS_SANDBOX is 'false'", async () => {
    vi.stubEnv("BKASH_IS_SANDBOX", "false");
    vi.resetModules();
    const fetchMock = mockFetchSequence(grantOk, {
      paymentID: "pid-1",
      bkashURL: "https://gw/pay",
    });
    const { createBkashPayment } = await import("./bkash");
    await createBkashPayment({ tranId: "tran-1", amount: 2000, callbackURL: "https://x/cb" });
    expect(fetchMock.mock.calls[0][0]).toContain("https://tokenized.pay.bka.sh");
  });

  it("returns paymentID and bkashURL on success", async () => {
    vi.resetModules();
    mockFetchSequence(grantOk, { paymentID: "pid-1", bkashURL: "https://gw/pay/xyz" });
    const { createBkashPayment } = await import("./bkash");
    await expect(
      createBkashPayment({ tranId: "tran-1", amount: 2000, callbackURL: "https://x/cb" }),
    ).resolves.toEqual({ paymentID: "pid-1", bkashURL: "https://gw/pay/xyz" });
  });

  it("throws the gateway's statusMessage when token grant fails", async () => {
    vi.resetModules();
    mockFetchSequence({ statusMessage: "Invalid credentials" });
    const { createBkashPayment } = await import("./bkash");
    await expect(
      createBkashPayment({ tranId: "tran-1", amount: 2000, callbackURL: "https://x/cb" }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("throws when create payment response is missing paymentID/bkashURL", async () => {
    vi.resetModules();
    mockFetchSequence(grantOk, { statusMessage: "Invalid amount" });
    const { createBkashPayment } = await import("./bkash");
    await expect(
      createBkashPayment({ tranId: "tran-1", amount: 2000, callbackURL: "https://x/cb" }),
    ).rejects.toThrow("Invalid amount");
  });

  it("executeBkashPayment grants a token then posts paymentID, returns parsed json", async () => {
    vi.resetModules();
    const fetchMock = mockFetchSequence(grantOk, {
      transactionStatus: "Completed",
      trxID: "trx-1",
      amount: "2000",
      merchantInvoiceNumber: "tran-1",
    });
    const { executeBkashPayment } = await import("./bkash");
    const result = await executeBkashPayment("pid-1");
    expect(result).toEqual({
      transactionStatus: "Completed",
      trxID: "trx-1",
      amount: "2000",
      merchantInvoiceNumber: "tran-1",
    });
    const executeCall = fetchMock.mock.calls[1];
    expect(executeCall[0]).toContain("/tokenized/checkout/execute");
    expect(JSON.parse(executeCall[1].body)).toEqual({ paymentID: "pid-1" });
  });
});
