import { afterEach, describe, expect, it } from "vitest";
import db from "./db";

afterEach(async () => {
  await db.walkSessions.clear();
  await db.walkPoints.clear();
  await db.offlineAreas.clear();
});

describe("landlord Dexie schema", () => {
  it("opens with the expected table names", () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ["offlineAreas", "walkPoints", "walkSessions"].sort(),
    );
  });

  it("stores and retrieves a walk session by id", async () => {
    await db.walkSessions.add({ id: "s1", plotId: "p1", status: "active", startedAt: 1 });
    const found = await db.walkSessions.get("s1");
    expect(found).toEqual({ id: "s1", plotId: "p1", status: "active", startedAt: 1 });
  });

  it("auto-increments walkPoints ids", async () => {
    const id1 = await db.walkPoints.add({
      sessionId: "s1",
      plotId: "p1",
      seq: 0,
      lat: 1,
      lng: 2,
      accuracy: null,
      capturedAt: 1,
      synced: 0,
    });
    const id2 = await db.walkPoints.add({
      sessionId: "s1",
      plotId: "p1",
      seq: 1,
      lat: 1,
      lng: 2,
      accuracy: null,
      capturedAt: 2,
      synced: 0,
    });
    expect(id2).toBeGreaterThan(id1);
  });

  it("supports the compound [sessionId+seq] index for ordered lookups", async () => {
    await db.walkPoints.bulkAdd([
      { sessionId: "s1", plotId: "p1", seq: 1, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 0 },
      { sessionId: "s1", plotId: "p1", seq: 0, lat: 0, lng: 0, accuracy: null, capturedAt: 1, synced: 0 },
    ]);
    const ordered = await db.walkPoints.where("sessionId").equals("s1").sortBy("seq");
    expect(ordered.map((p) => p.seq)).toEqual([0, 1]);
  });

  it("supports querying offlineAreas by downloadedAt", async () => {
    await db.offlineAreas.add({
      id: "a1",
      label: "Area",
      west: 0,
      south: 0,
      east: 1,
      north: 1,
      minZoom: 10,
      maxZoom: 16,
      tileCount: 100,
      bytesStored: 1000,
      downloadedAt: 5,
    });
    const areas = await db.offlineAreas.where("downloadedAt").above(0).toArray();
    expect(areas).toHaveLength(1);
  });
});
