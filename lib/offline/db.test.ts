import { afterEach, describe, expect, it } from "vitest";
import db from "./db";

afterEach(async () => {
  await db.offlineAreas.clear();
  await db.guestPlots.clear();
  await db.guestApartments.clear();
});

describe("landlord Dexie schema", () => {
  it("opens with the expected table names", () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ["guestApartments", "guestPlots", "offlineAreas"].sort(),
    );
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

  it("stores and retrieves a guest plot by id", async () => {
    const plot = {
      id: "g1",
      name: "Test plot",
      upazila: null,
      district: null,
      division: null,
      dolilArea: null,
      dolilAreaUnit: null,
      actualArea: null,
      actualAreaUnit: null,
      village: null,
      mutationNumber: null,
      purchasePrice: null,
      purchaseDate: null,
      currentEstimatedValue: null,
      notes: null,
      boundaryGeojson: null,
      areaSqMeters: null,
      createdAt: 1,
      updatedAt: 1,
    };
    await db.guestPlots.add(plot);
    expect(await db.guestPlots.get("g1")).toEqual(plot);
  });

  it("stores and retrieves a guest apartment by id", async () => {
    const apartment = {
      id: "ga1",
      name: "Test apartment",
      upazila: null,
      district: null,
      division: null,
      floor: null,
      size: null,
      sizeUnit: null,
      buildingName: null,
      unitNumber: null,
      purchasePrice: null,
      purchaseDate: null,
      currentEstimatedValue: null,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
    };
    await db.guestApartments.add(apartment);
    expect(await db.guestApartments.get("ga1")).toEqual(apartment);
  });
});
