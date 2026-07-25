import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baseParams = {
  tranId: "tran-1",
  amount: 2000,
  customerEmail: "a@b.com",
  customerName: "A B",
  successUrl: "https://x/success",
  failUrl: "https://x/fail",
  cancelUrl: "https://x/cancel",
  ipnUrl: "https://x/ipn",
};

describe("sslcommerz", () => {
  beforeEach(() => {
    vi.stubEnv("SSLCOMMERZ_STORE_ID", "store123");
    vi.stubEnv("SSLCOMMERZ_STORE_PASSWORD", "pass123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("defaults LIFETIME_PRICE_BDT to 2000 when env unset", async () => {
    vi.stubEnv("LIFETIME_PRICE_BDT", undefined);
    const mod = await import("./sslcommerz");
    expect(mod.LIFETIME_PRICE_BDT).toBe(2000);
  });

  it("reads LIFETIME_PRICE_BDT from env when set", async () => {
    vi.stubEnv("LIFETIME_PRICE_BDT", "5000");
    vi.resetModules();
    const mod = await import("./sslcommerz");
    expect(mod.LIFETIME_PRICE_BDT).toBe(5000);
  });

  it("uses the sandbox host unless SSLCOMMERZ_IS_SANDBOX is exactly 'false'", async () => {
    vi.stubEnv("SSLCOMMERZ_IS_SANDBOX", "true");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://gw" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { createSslcommerzSession } = await import("./sslcommerz");
    await createSslcommerzSession(baseParams);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://sandbox.sslcommerz.com"),
      expect.anything(),
    );
  });

  it("uses the live host when SSLCOMMERZ_IS_SANDBOX is 'false'", async () => {
    vi.stubEnv("SSLCOMMERZ_IS_SANDBOX", "false");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://gw" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { createSslcommerzSession } = await import("./sslcommerz");
    await createSslcommerzSession(baseParams);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://securepay.sslcommerz.com"),
      expect.anything(),
    );
  });

  it("returns the GatewayPageURL on success", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://gw/pay/xyz" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { createSslcommerzSession } = await import("./sslcommerz");
    await expect(createSslcommerzSession(baseParams)).resolves.toBe("https://gw/pay/xyz");
  });

  it("throws the gateway's failedreason when status is not SUCCESS", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "FAILED", failedreason: "Invalid store credentials" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { createSslcommerzSession } = await import("./sslcommerz");
    await expect(createSslcommerzSession(baseParams)).rejects.toThrow(
      "Invalid store credentials",
    );
  });

  it("throws a generic error when failedreason is absent", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "FAILED" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { createSslcommerzSession } = await import("./sslcommerz");
    await expect(createSslcommerzSession(baseParams)).rejects.toThrow(
      "Failed to initiate SSLCommerz session",
    );
  });

  it("throws when GatewayPageURL is missing even if status is SUCCESS", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "SUCCESS" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { createSslcommerzSession } = await import("./sslcommerz");
    await expect(createSslcommerzSession(baseParams)).rejects.toThrow();
  });

  it("validateSslcommerzPayment issues a GET with val_id and store creds, returns parsed json", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: "VALID" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { validateSslcommerzPayment } = await import("./sslcommerz");
    const result = await validateSslcommerzPayment("val-1");
    expect(result).toEqual({ status: "VALID" });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("val_id=val-1");
    expect(calledUrl).toContain("store_id=store123");
  });
});
