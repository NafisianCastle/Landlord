import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), config: vi.fn() }));
vi.mock("web-push", () => ({ default: { sendNotification: mocks.send } }));
vi.mock("@/lib/pushConfig", () => ({ getPushConfiguration: mocks.config }));
import { sendPush } from "./webPush";
const sub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/subscription",
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
  it("never contacts a host that isn't a push service, and drops the row", async () => {
    const rogue = { ...sub, endpoint: "https://169.254.169.254/latest" };
    await expect(sendPush(rogue, { title: "t", body: "b" })).resolves.toEqual({
      endpoint: rogue.endpoint, sent: false, expired: true,
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("gives up on a push service that doesn't answer", async () => {
    await sendPush(sub, { title: "t", body: "b" });
    expect(mocks.send.mock.calls[0][2]).toMatchObject({ timeout: 10_000 });
  });
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
