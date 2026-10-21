import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { getPushConfiguration, getRentReminderPublicKey } from "./pushConfig";

const keys = webpush.generateVAPIDKeys();
beforeEach(() => {
  vi.stubEnv("VAPID_PUBLIC_KEY", keys.publicKey);
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
  vi.stubEnv("VAPID_PRIVATE_KEY", keys.privateKey);
  vi.stubEnv("VAPID_SUBJECT", "mailto:reminders@example.com");
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("push configuration", () => {
  it("returns only the public key for client props when delivery is configured", () => {
    expect(getRentReminderPublicKey()).toBe(keys.publicKey);
  });
  it.each([
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
    "CRON_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ])("does not offer reminders when %s is missing", (name) => {
    vi.stubEnv(name, "");
    expect(getRentReminderPublicKey()).toBeNull();
  });
  it("supports the legacy public-key setting", () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", keys.publicKey);
    expect(getRentReminderPublicKey()).toBe(keys.publicKey);
  });
  it("rejects a mismatched private/public pair", () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", webpush.generateVAPIDKeys().privateKey);
    expect(getPushConfiguration()).toBeNull();
  });
  it("rejects malformed public keys and contact subjects", () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "invalid");
    expect(getPushConfiguration()).toBeNull();
    vi.stubEnv("VAPID_PUBLIC_KEY", keys.publicKey);
    vi.stubEnv("VAPID_SUBJECT", "http://example.com");
    expect(getPushConfiguration()).toBeNull();
  });
});
