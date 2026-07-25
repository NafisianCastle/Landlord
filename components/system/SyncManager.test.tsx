import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "@/test/i18n";
import SyncManager from "./SyncManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const syncPendingMock = vi.fn();
vi.mock("@/lib/offline/syncQueue", () => ({
  syncPending: (...a: unknown[]) => syncPendingMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  syncPendingMock.mockResolvedValue({ finished: [] });
});

describe("SyncManager", () => {
  it("attempts a sync on mount", async () => {
    render(<SyncManager />);
    expect(syncPendingMock).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("refreshes the router when a sync finishes at least one plot", async () => {
    syncPendingMock.mockResolvedValue({ finished: ["p1"] });
    render(<SyncManager />);
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("re-syncs when the browser comes back online", async () => {
    render(<SyncManager />);
    await Promise.resolve();
    syncPendingMock.mockClear();
    window.dispatchEvent(new Event("online"));
    expect(syncPendingMock).toHaveBeenCalledTimes(1);
  });

  it("re-syncs on document visibility change", async () => {
    render(<SyncManager />);
    await Promise.resolve();
    syncPendingMock.mockClear();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(syncPendingMock).toHaveBeenCalledTimes(1);
  });

  it("removes its event listeners on unmount", async () => {
    const { unmount } = render(<SyncManager />);
    await Promise.resolve();
    unmount();
    syncPendingMock.mockClear();
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(syncPendingMock).not.toHaveBeenCalled();
  });

  it("renders nothing", () => {
    const { container } = render(<SyncManager />);
    expect(container).toBeEmptyDOMElement();
  });
});
