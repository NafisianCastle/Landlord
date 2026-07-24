import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import db from "./db";

const getUserMock = vi.fn();
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ upsert: upsertMock }));
const savePlotBoundaryMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("@/app/actions/plots", () => ({
  savePlotBoundary: savePlotBoundaryMock,
}));

async function clearDb() {
  await db.walkSessions.clear();
  await db.walkPoints.clear();
  await db.offlineAreas.clear();
}

describe("syncQueue", () => {
  beforeEach(async () => {
    await clearDb();
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    // Default to a failing upload so recordPoint's fire-and-forget background
    // sync (`void syncPending()`) can't race ahead and mark points synced
    // before a test's own explicit syncPending() call. Tests that exercise
    // a successful sync flip this to succeed right before calling it.
    upsertMock.mockResolvedValue({ error: { message: "disabled by default in tests" } });
    savePlotBoundaryMock.mockResolvedValue({});
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(async () => {
    await clearDb();
  });

  it("pendingCount returns 0 with no data", async () => {
    const { pendingCount } = await import("./syncQueue");
    expect(await pendingCount()).toBe(0);
  });

  it("pendingCount counts only unsynced points, optionally filtered by plot", async () => {
    const { pendingCount } = await import("./syncQueue");
    await db.walkPoints.bulkAdd([
      { sessionId: "s1", plotId: "p1", seq: 0, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 0 },
      { sessionId: "s1", plotId: "p2", seq: 0, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 0 },
      { sessionId: "s1", plotId: "p1", seq: 1, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 1 },
    ]);
    expect(await pendingCount()).toBe(2);
    expect(await pendingCount("p1")).toBe(1);
    expect(await pendingCount("p3")).toBe(0);
  });

  it("resumeOrCreateSession creates a new active session when none exists", async () => {
    const { resumeOrCreateSession } = await import("./syncQueue");
    const { session, points } = await resumeOrCreateSession("p1");
    expect(session.plotId).toBe("p1");
    expect(session.status).toBe("active");
    expect(points).toEqual([]);
    expect(await db.walkSessions.get(session.id)).toBeDefined();
  });

  it("resumeOrCreateSession resumes the most recent non-done session with its points", async () => {
    const { resumeOrCreateSession } = await import("./syncQueue");
    await db.walkSessions.add({ id: "old", plotId: "p1", status: "done", startedAt: 1 });
    await db.walkSessions.add({ id: "active1", plotId: "p1", status: "active", startedAt: 2 });
    await db.walkPoints.bulkAdd([
      { sessionId: "active1", plotId: "p1", seq: 1, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 0 },
      { sessionId: "active1", plotId: "p1", seq: 0, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 0 },
    ]);
    const { session, points } = await resumeOrCreateSession("p1");
    expect(session.id).toBe("active1");
    expect(points.map((p) => p.seq)).toEqual([0, 1]);
  });

  it("recordPoint persists a point and triggers a sync attempt", async () => {
    const { recordPoint, pendingCount } = await import("./syncQueue");
    await recordPoint("s1", "p1", 0, 23.8, 90.4, 5);
    expect(await pendingCount("p1")).toBe(1);
  });

  it("undoLastPoint removes the highest-seq point for a session", async () => {
    const { recordPoint, undoLastPoint, pendingCount } = await import("./syncQueue");
    await recordPoint("s1", "p1", 0, 0, 0, null);
    await recordPoint("s1", "p1", 1, 0, 0, null);
    await undoLastPoint("s1");
    expect(await pendingCount("p1")).toBe(1);
    const remaining = await db.walkPoints.where("sessionId").equals("s1").toArray();
    expect(remaining[0].seq).toBe(0);
  });

  it("undoLastPoint is a no-op when there are no points", async () => {
    const { undoLastPoint } = await import("./syncQueue");
    await expect(undoLastPoint("nonexistent")).resolves.toBeUndefined();
  });

  it("deletePointAt removes the target point and renumbers the rest contiguously", async () => {
    const { recordPoint, deletePointAt } = await import("./syncQueue");
    await recordPoint("s1", "p1", 0, 0, 0, null);
    await recordPoint("s1", "p1", 1, 0, 0, null);
    await recordPoint("s1", "p1", 2, 0, 0, null);
    await deletePointAt("s1", 1);
    const remaining = await db.walkPoints.where("sessionId").equals("s1").sortBy("seq");
    expect(remaining.map((p) => p.seq)).toEqual([0, 1]);
    expect(remaining.every((p) => p.synced === 0)).toBe(true);
  });

  it("deletePointAt marks renumbered points unsynced so they re-upload", async () => {
    const { recordPoint, deletePointAt } = await import("./syncQueue");
    await recordPoint("s1", "p1", 0, 0, 0, null);
    await recordPoint("s1", "p1", 1, 0, 0, null);
    await recordPoint("s1", "p1", 2, 0, 0, null);
    await db.walkPoints.where("sessionId").equals("s1").modify({ synced: 1 });
    await deletePointAt("s1", 0);
    const remaining = await db.walkPoints.where("sessionId").equals("s1").sortBy("seq");
    // point that was seq 1 -> becomes seq 0 -> should flip to unsynced
    // point that was seq 2 -> becomes seq 1 -> should flip to unsynced
    expect(remaining.every((p) => p.synced === 0)).toBe(true);
  });

  it("finishSession marks the session pending-finish and attempts sync", async () => {
    const { resumeOrCreateSession, finishSession } = await import("./syncQueue");
    const { session } = await resumeOrCreateSession("p1");
    await finishSession("p1", session.id);
    const updated = await db.walkSessions.get(session.id);
    expect(updated?.status === "pending-finish" || updated?.status === "done").toBe(true);
  });

  describe("syncPending", () => {
    it("returns immediately with no finished sessions when offline", async () => {
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
      const { syncPending, recordPoint } = await import("./syncQueue");
      await recordPoint("s1", "p1", 0, 0, 0, null);
      vi.clearAllMocks();
      const result = await syncPending();
      expect(result).toEqual({ finished: [] });
      expect(getUserMock).not.toHaveBeenCalled();
    });

    it("returns immediately when there is no authenticated user", async () => {
      getUserMock.mockResolvedValue({ data: { user: null } });
      const { syncPending, recordPoint } = await import("./syncQueue");
      await recordPoint("s1", "p1", 0, 0, 0, null);
      const result = await syncPending();
      expect(result).toEqual({ finished: [] });
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it("uploads unsynced points grouped by session and marks them synced on success", async () => {
      const { syncPending, recordPoint, pendingCount } = await import("./syncQueue");
      await recordPoint("s1", "p1", 0, 0, 0, null);
      await recordPoint("s1", "p1", 1, 0, 0, null);
      // Let recordPoint's own fire-and-forget background sync attempts
      // (which fail, per the default mock) settle before measuring calls
      // triggered by this test's explicit syncPending().
      await new Promise((resolve) => setTimeout(resolve, 0));
      upsertMock.mockClear();
      upsertMock.mockResolvedValue({ error: null });
      await syncPending();
      // One upsert call for the single session batching both points.
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(await pendingCount("p1")).toBe(0);
    });

    it("leaves points unsynced when the upsert fails", async () => {
      upsertMock.mockResolvedValue({ error: { message: "network error" } });
      const { syncPending, recordPoint, pendingCount } = await import("./syncQueue");
      await recordPoint("s1", "p1", 0, 0, 0, null);
      await syncPending();
      expect(await pendingCount("p1")).toBe(1);
    });

    it("finalizes a pending-finish session with >=3 points via savePlotBoundary", async () => {
      const { syncPending, resumeOrCreateSession, recordPoint, finishSession } = await import(
        "./syncQueue"
      );
      const { session } = await resumeOrCreateSession("p1");
      await recordPoint(session.id, "p1", 0, 0, 0, null);
      await recordPoint(session.id, "p1", 1, 0, 1, null);
      await recordPoint(session.id, "p1", 2, 1, 1, null);
      await db.walkSessions.update(session.id, { status: "pending-finish" });

      const result = await syncPending();
      expect(savePlotBoundaryMock).toHaveBeenCalledWith(
        "p1",
        expect.arrayContaining([expect.objectContaining({ lat: 0, lng: 0 })]),
      );
      expect(result.finished).toEqual(["p1"]);
      const updated = await db.walkSessions.get(session.id);
      expect(updated?.status).toBe("done");
    });

    it("skips finalizing a pending-finish session with fewer than 3 points", async () => {
      const { syncPending, resumeOrCreateSession, recordPoint } = await import("./syncQueue");
      const { session } = await resumeOrCreateSession("p1");
      await recordPoint(session.id, "p1", 0, 0, 0, null);
      await db.walkSessions.update(session.id, { status: "pending-finish" });

      const result = await syncPending();
      expect(savePlotBoundaryMock).not.toHaveBeenCalled();
      expect(result.finished).toEqual([]);
      const updated = await db.walkSessions.get(session.id);
      expect(updated?.status).toBe("pending-finish");
    });

    it("does not mark a session done when savePlotBoundary returns an error", async () => {
      savePlotBoundaryMock.mockResolvedValue({ error: "failed" });
      const { syncPending, resumeOrCreateSession, recordPoint } = await import("./syncQueue");
      const { session } = await resumeOrCreateSession("p1");
      await recordPoint(session.id, "p1", 0, 0, 0, null);
      await recordPoint(session.id, "p1", 1, 0, 1, null);
      await recordPoint(session.id, "p1", 2, 1, 1, null);
      await db.walkSessions.update(session.id, { status: "pending-finish" });

      const result = await syncPending();
      expect(result.finished).toEqual([]);
      const updated = await db.walkSessions.get(session.id);
      expect(updated?.status).toBe("pending-finish");
    });
  });

  describe("onSyncStateChange", () => {
    it("notifies subscribers when recordPoint runs", async () => {
      const { onSyncStateChange, recordPoint } = await import("./syncQueue");
      const cb = vi.fn();
      onSyncStateChange(cb);
      await recordPoint("s1", "p1", 0, 0, 0, null);
      expect(cb).toHaveBeenCalled();
    });

    it("stops notifying after unsubscribe", async () => {
      const { onSyncStateChange, recordPoint } = await import("./syncQueue");
      const cb = vi.fn();
      const unsubscribe = onSyncStateChange(cb);
      unsubscribe();
      await recordPoint("s1", "p1", 0, 0, 0, null);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
