import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), config: vi.fn() }));
vi.mock("web-push", () => ({ default: { sendNotification: mocks.send } }));
vi.mock("@/lib/pushConfig", () => ({ getPushConfiguration: mocks.config }));
import { sendPush } from "./webPush";
const sub = {
  endpoint: "https://push.example/subscription",
  p256dh: "test-key",
  auth: "test-auth",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.mockReturnValue({
    publicKey: "test-public",
    privateKey: "test-private",
    subject: "mailto:test@example.com",
  });
  mocks.send.mockResolvedValue(undefined);
});
describe("sendPush", () => {
  it("only reports sent after provider acceptance", async () => {
    await expect(
      sendPush(sub, { title: "Rent due", body: "Example" }),
    ).resolves.toEqual({ endpoint: sub.endpoint, sent: true, expired: false });
  });
  it.each([401, 429, 500])(
    "keeps a %s failure retryable instead of reporting delivery",
    async (statusCode) => {
      mocks.send.mockRejectedValue({ statusCode });
      await expect(
        sendPush(sub, { title: "Rent due", body: "Example" }),
      ).resolves.toEqual({
        endpoint: sub.endpoint,
        sent: false,
        expired: false,
      });
    },
  );
  it.each([404, 410])(
    "identifies an expired %s subscription",
    async (statusCode) => {
      mocks.send.mockRejectedValue({ statusCode });
      await expect(
        sendPush(sub, { title: "Rent due", body: "Example" }),
      ).resolves.toEqual({
        endpoint: sub.endpoint,
        sent: false,
        expired: true,
      });
    },
  );
  it("does not attempt a send without valid configuration", async () => {
    mocks.config.mockReturnValue(null);
    expect(
      (await sendPush(sub, { title: "Rent due", body: "Example" })).sent,
    ).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
