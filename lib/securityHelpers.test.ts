import { afterEach, describe, expect, it, vi } from "vitest";
import { safeNextPath } from "./safeRedirect";
import { cronAuthorized } from "./cronAuth";
import { isAllowedPushEndpoint, parsePushSubscription } from "./pushEndpoint";
import { redactPortalTokens } from "./sentryScrub";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/plots/123?tab=docs")).toBe("/plots/123?tab=docs");
  });

  it.each(["@evil.com", ".evil.com", "//evil.com", "/\\evil.com", "https://evil.com", "evil", "/x\\y", "/a\u0000b"])(
    "falls back to the dashboard for %j",
    (next) => {
      expect(safeNextPath(next)).toBe("/dashboard");
    },
  );

  it("falls back when missing", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});

describe("cronAuthorized", () => {
  afterEach(() => vi.unstubAllEnvs());
  const req = (auth?: string) => new Request("https://x.test/api/cron", { headers: auth ? { authorization: auth } : {} });

  it("accepts the exact bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(cronAuthorized(req("Bearer s3cret"))).toBe(true);
  });

  it("refuses a wrong or missing header", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(cronAuthorized(req("Bearer s3cre"))).toBe(false);
    expect(cronAuthorized(req())).toBe(false);
  });

  it("refuses everything when the secret is unset or blank", () => {
    vi.stubEnv("CRON_SECRET", "  ");
    expect(cronAuthorized(req("Bearer "))).toBe(false);
  });
});

describe("push endpoints", () => {
  it("allows real browser push services", () => {
    for (const url of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/QABC",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) expect(isAllowedPushEndpoint(url), url).toBe(true);
  });

  it("refuses internal, plain-http, look-alike and oversized URLs", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://169.254.169.254/latest/meta-data",
      "https://fcm.googleapis.com.evil.com/x",
      "https://evil.com/https://fcm.googleapis.com/",
      `https://fcm.googleapis.com/${"a".repeat(1000)}`,
      42,
    ]) expect(isAllowedPushEndpoint(url), String(url)).toBe(false);
  });

  it("parses a subscription only when every part is valid", () => {
    const keys = { p256dh: "k", auth: "a" };
    expect(parsePushSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys })).toEqual({
      endpoint: "https://fcm.googleapis.com/fcm/send/x", p256dh: "k", auth: "a",
    });
    expect(parsePushSubscription({ endpoint: "https://evil.com/x", keys })).toBeNull();
    expect(parsePushSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "k" } })).toBeNull();
    expect(parsePushSubscription(null)).toBeNull();
  });
});

describe("redactPortalTokens", () => {
  it("hides tenant portal tokens in pages and file routes", () => {
    expect(redactPortalTokens("https://x.test/tenant/bills/abc123?x=1")).toBe("https://x.test/tenant/bills/[token]?x=1");
    expect(redactPortalTokens("/api/tenant-portal/abc123/files/f1")).toBe("/api/tenant-portal/[token]/files/f1");
    expect(redactPortalTokens("/plots/abc123")).toBe("/plots/abc123");
  });
});
