import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ seed: vi.fn() }));
vi.mock("@/lib/demoSeed.mjs", () => ({ seedDemoAccount: mocks.seed }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ admin: true }) }));

import { GET } from "./route";

const req = (auth = "Bearer cron-secret") =>
  new Request("https://x.test/api/cron/demo-reset", { headers: { authorization: auth } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
  vi.stubEnv("DEMO_USER_EMAIL", "demo@example.test");
  vi.stubEnv("DEMO_USER_PASSWORD", "pw");
  mocks.seed.mockResolvedValue("demo-id");
});
afterEach(() => vi.unstubAllEnvs());

describe("demo reset cron", () => {
  it("requires the cron secret", async () => {
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(mocks.seed).not.toHaveBeenCalled();
  });

  it("does nothing while the demo is switched off", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "false");
    expect(await (await GET(req())).json()).toEqual({ skipped: true });
    expect(mocks.seed).not.toHaveBeenCalled();
  });

  it("re-seeds the demo with the service role", async () => {
    expect(await (await GET(req())).json()).toEqual({ reset: true });
    expect(mocks.seed).toHaveBeenCalledWith({ admin: true }, expect.objectContaining({ email: "demo@example.test", password: "pw" }));
  });

  it("reports a failed reset without leaking details", async () => {
    mocks.seed.mockRejectedValue(new Error("db exploded"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Reset failed" });
  });
});
