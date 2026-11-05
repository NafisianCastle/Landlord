import { afterEach, describe, expect, it, vi } from "vitest";
import { demoEnabled, isDemoAccount } from "./demo";

afterEach(() => vi.unstubAllEnvs());

describe("demoEnabled", () => {
  it("needs the flag and both credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
    vi.stubEnv("DEMO_USER_EMAIL", "demo@example.test");
    vi.stubEnv("DEMO_USER_PASSWORD", "pw");
    expect(demoEnabled()).toBe(true);
    vi.stubEnv("DEMO_USER_PASSWORD", "");
    expect(demoEnabled()).toBe(false);
    vi.stubEnv("DEMO_USER_PASSWORD", "pw");
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "false");
    expect(demoEnabled()).toBe(false);
  });
});

describe("isDemoAccount", () => {
  const client = (row: unknown) =>
    ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }) }) as never;

  it("reads profiles.is_demo", async () => {
    expect(await isDemoAccount(client({ is_demo: true }), "u")).toBe(true);
    expect(await isDemoAccount(client({ is_demo: false }), "u")).toBe(false);
    expect(await isDemoAccount(client(null), "u")).toBe(false);
  });
});
