import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  send: vi.fn(),
  fcm: vi.fn(),
  config: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/webPush", () => ({ sendPush: mocks.send }));
vi.mock("@/lib/fcm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/fcm")>()),
  sendFcm: mocks.fcm,
}));
vi.mock("@/lib/pushConfig", () => ({ remindersConfigured: mocks.config }));
import { GET as rent } from "./rent-reminders/route";
import { GET as expiry } from "./lease-expiry/route";

const update = vi.fn();
const remove = vi.fn();
const from = vi.fn();
let deviceTokens: { user_id: string; token: string }[] = [];
beforeEach(() => {
  deviceTokens = [];
  mocks.fcm.mockResolvedValue({ token: "fcm-token", expired: false, sent: false });
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  mocks.config.mockReturnValue(true);
  mocks.send.mockResolvedValue({
    endpoint: "https://push.example/test",
    expired: false,
    sent: false,
  });
  mocks.admin.mockReturnValue({ from });
  from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "lte", "not", "in"])
      chain[method] = () => chain;
    chain.update = (value: unknown) => {
      update(table, value);
      return chain;
    };
    chain.delete = () => {
      remove(table);
      return chain;
    };
    chain.then = (resolve: (value: unknown) => void) =>
      resolve({
        error: null,
        data:
          table === "device_push_tokens"
            ? deviceTokens
            : table === "push_subscriptions"
            ? [
                {
                  user_id: "u1",
                  endpoint: "https://push.example/test",
                  p256dh: "test",
                  auth: "test",
                },
              ]
            : [
                {
                  id: "row1",
                  user_id: "u1",
                  amount: 1000,
                  due_date: "2026-01-01",
                  end_date: "2026-01-01",
                  tenant_name: "Example",
                  leases: { tenant_name: "Example" },
                },
              ],
      });
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());
const authorized = () =>
  new Request("https://example.com/api/cron/test", {
    headers: { authorization: "Bearer test-cron-secret" },
  });

describe.each([
  ["rent", rent],
  ["lease expiry", expiry],
] as const)("%s reminders", (_name, handler) => {
  it("rejects requests when CRON_SECRET is absent, including Bearer undefined", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await handler(
      new Request("https://example.com", {
        headers: { authorization: "Bearer undefined" },
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("reports unavailable delivery before accessing records when configuration is missing", async () => {
    mocks.config.mockReturnValue(false);
    expect((await handler(authorized())).status).toBe(503);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("does not mark a transient delivery failure as reminded", async () => {
    const response = await handler(authorized());
    expect(await response.json()).toEqual({
      sent: 0,
      expiredSubscriptionsRemoved: 0,
    });
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it("marks a reminder after actual provider acceptance", async () => {
    mocks.send.mockResolvedValue({
      endpoint: "https://push.example/test",
      expired: false,
      sent: true,
    });
    const response = await handler(authorized());
    expect((await response.json()).sent).toBe(1);
    expect(update).toHaveBeenCalledOnce();
  });
  it("prunes an expired subscription without marking delivery", async () => {
    mocks.send.mockResolvedValue({
      endpoint: "https://push.example/test",
      expired: true,
      sent: false,
    });
    const response = await handler(authorized());
    expect(await response.json()).toEqual({
      sent: 0,
      expiredSubscriptionsRemoved: 1,
    });
    expect(remove).toHaveBeenCalledWith("push_subscriptions");
    expect(update).not.toHaveBeenCalled();
  });
  it("delivers to the mobile app through FCM when the user has a device token", async () => {
    deviceTokens = [{ user_id: "u1", token: "fcm-token" }];
    mocks.fcm.mockResolvedValue({ token: "fcm-token", expired: false, sent: true });
    const response = await handler(authorized());
    expect((await response.json()).sent).toBe(1);
    expect(mocks.fcm).toHaveBeenCalledWith(
      "fcm-token",
      expect.objectContaining({ title: expect.any(String) }),
    );
    expect(update).toHaveBeenCalledOnce();
  });
  it("prunes an unregistered FCM token", async () => {
    deviceTokens = [{ user_id: "u1", token: "fcm-token" }];
    mocks.fcm.mockResolvedValue({ token: "fcm-token", expired: true, sent: false });
    const response = await handler(authorized());
    expect(await response.json()).toEqual({
      sent: 0,
      expiredSubscriptionsRemoved: 1,
    });
    expect(remove).toHaveBeenCalledWith("device_push_tokens");
    expect(update).not.toHaveBeenCalled();
  });
});
