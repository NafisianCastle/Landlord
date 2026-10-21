import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/i18n";
import RentReminderSettings from "./RentReminderSettings";

const publicKey = Buffer.concat([
  Buffer.from([4]),
  Buffer.alloc(64, 1),
]).toString("base64url");
const getSubscription = vi.fn();
const subscribe = vi.fn();
const unsubscribe = vi.fn();
const requestPermission = vi.fn();
const fetchMock = vi.fn();
const subscription = {
  endpoint: "https://push.example/subscription",
  unsubscribe,
  toJSON: () => ({
    endpoint: "https://push.example/subscription",
    keys: { p256dh: "test-key", auth: "test-auth" },
  }),
};
const registration = { pushManager: { getSubscription, subscribe } };

beforeEach(() => {
  vi.clearAllMocks();
  getSubscription.mockResolvedValue(null);
  subscribe.mockResolvedValue(subscription);
  unsubscribe.mockResolvedValue(true);
  requestPermission.mockResolvedValue("granted");
  fetchMock.mockResolvedValue({ ok: true });
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  vi.stubGlobal("PushManager", function () {});
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

async function enable() {
  await userEvent.click(
    await screen.findByRole("button", { name: "Enable rent reminders" }),
  );
}

describe("RentReminderSettings", () => {
  it("explains missing setup and never prompts for permission when unconfigured", async () => {
    render(<RentReminderSettings publicKey={null} />);
    expect(
      await screen.findByRole("button", { name: "Enable rent reminders" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/aren’t available on this site yet/),
    ).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("uses the server-provided public key and saves before showing enabled", async () => {
    render(<RentReminderSettings publicKey={publicKey} />);
    await enable();
    expect(
      await screen.findByRole("button", { name: "Disable rent reminders" }),
    ).toBeEnabled();
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not confuse dismissing the permission prompt with a permanent block", async () => {
    requestPermission.mockResolvedValue("default");
    render(<RentReminderSettings publicKey={publicKey} />);
    await enable();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can try again",
    );
    expect(
      screen.getByRole("button", { name: "Enable rent reminders" }),
    ).toBeEnabled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("shows browser instructions when permission is denied", async () => {
    requestPermission.mockResolvedValue("denied");
    render(<RentReminderSettings publicKey={publicKey} />);
    await enable();
    expect(
      await screen.findByText(/Notifications are blocked/),
    ).toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("undoes a new browser subscription if saving it fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<RentReminderSettings publicKey={publicKey} />);
    await enable();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't enable reminders",
    );
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Disable rent reminders" }),
    ).not.toBeInTheDocument();
  });

  it("does not unsubscribe an existing browser subscription when its server save fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<RentReminderSettings publicKey={publicKey} />);
    await screen.findByRole("button", { name: "Enable rent reminders" });
    getSubscription.mockResolvedValue(subscription);
    await enable();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't enable reminders",
    );
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("does not claim disabling succeeded if the server rejects it", async () => {
    getSubscription.mockResolvedValue(subscription);
    fetchMock.mockResolvedValue({ ok: false });
    render(<RentReminderSettings publicKey={publicKey} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Disable rent reminders" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't disable reminders",
    );
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Disable rent reminders" }),
    ).toBeEnabled();
  });

  it("allows removing an existing subscription even if delivery setup is missing", async () => {
    getSubscription.mockResolvedValue(subscription);
    render(<RentReminderSettings publicKey={null} />);
    expect(
      await screen.findByText("This device has a saved reminder subscription."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Disable rent reminders" }),
    );
    expect(
      await screen.findByRole("button", { name: "Enable rent reminders" }),
    ).toBeDisabled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("handles browsers without the Notification API", async () => {
    Reflect.deleteProperty(window, "Notification");
    render(<RentReminderSettings publicKey={publicKey} />);
    expect(
      await screen.findByText(
        "Your browser doesn't support push notifications.",
      ),
    ).toBeInTheDocument();
  });

  it("supports retrying a failed initial subscription check", async () => {
    getSubscription.mockRejectedValueOnce(new Error("Unavailable"));
    render(<RentReminderSettings publicKey={publicKey} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );
    expect(
      await screen.findByRole("button", { name: "Enable rent reminders" }),
    ).toBeEnabled();
  });

  it("does not wait indefinitely when a service worker cannot become ready", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(registration),
        ready: new Promise(() => {}),
      },
    });
    render(<RentReminderSettings publicKey={publicKey} />);
    await act(async () => {});
    fireEvent.click(
      screen.getByRole("button", { name: "Enable rent reminders" }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't enable reminders",
    );
    expect(
      screen.getByRole("button", { name: "Enable rent reminders" }),
    ).toBeEnabled();
  });
});
