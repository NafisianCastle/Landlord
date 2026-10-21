import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import {
  getPushConfiguration,
  getRentReminderPublicKey,
  remindersConfigured,
} from "./pushConfig";

const keys = webpush.generateVAPIDKeys();
beforeEach(() => {
  vi.stubEnv("VAPID_PUBLIC_KEY", keys.publicKey);
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
  vi.stubEnv("VAPID_PRIVATE_KEY", keys.privateKey);
  vi.stubEnv("VAPID_SUBJECT", "mailto:reminders@example.com");
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", "");
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

describe("reminder channels", () => {
  const fcmAccount = JSON.stringify({
    project_id: "landlord-test",
    client_email: "push@example.com",
    private_key: "key",
  });
  it("runs with browser push only", () => {
    expect(remindersConfigured()).toBe(true);
  });
  it("runs with native (FCM) push only", () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(remindersConfigured()).toBe(false);
    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", fcmAccount);
    expect(remindersConfigured()).toBe(true);
  });
  it.each(["CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"])(
    "never runs without %s",
    (name) => {
      vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", fcmAccount);
      vi.stubEnv(name, "");
      expect(remindersConfigured()).toBe(false);
    },
  );
});
