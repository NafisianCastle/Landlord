"use client";

import type { Polygon } from "geojson";
import db, { type GuestPlot } from "./db";
import { type LatLng, pointsToPolygon, polygonAreaSqMeters } from "@/lib/geo";

export type { GuestPlot };

export interface GuestPlotMetadataInput {
  name: string;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
  dolilArea?: number | null;
  dolilAreaUnit?: string | null;
  actualArea?: number | null;
  actualAreaUnit?: string | null;
  village?: string | null;
  mutationNumber?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  currentEstimatedValue?: number | null;
  notes?: string | null;
}

export async function listGuestPlots(): Promise<GuestPlot[]> {
  return db.guestPlots.orderBy("createdAt").reverse().toArray();
}

export async function getGuestPlot(id: string): Promise<GuestPlot | undefined> {
  return db.guestPlots.get(id);
}

export async function createGuestPlot(fields: GuestPlotMetadataInput): Promise<GuestPlot> {
  const now = Date.now();
  const plot: GuestPlot = {
    id: crypto.randomUUID(),
    name: fields.name,
    upazila: fields.upazila ?? null,
    district: fields.district ?? null,
    division: fields.division ?? null,
    dolilArea: fields.dolilArea ?? null,
    dolilAreaUnit: fields.dolilAreaUnit ?? null,
    actualArea: fields.actualArea ?? null,
    actualAreaUnit: fields.actualAreaUnit ?? null,
    village: fields.village ?? null,
    mutationNumber: fields.mutationNumber ?? null,
    purchasePrice: fields.purchasePrice ?? null,
    purchaseDate: fields.purchaseDate ?? null,
    currentEstimatedValue: fields.currentEstimatedValue ?? null,
    notes: fields.notes ?? null,
    boundaryGeojson: null,
    areaSqMeters: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.guestPlots.add(plot);
  return plot;
}

export async function updateGuestPlotMetadata(
  id: string,
  fields: GuestPlotMetadataInput,
): Promise<void> {
  await db.guestPlots.update(id, {
    name: fields.name,
    upazila: fields.upazila ?? null,
    district: fields.district ?? null,
    division: fields.division ?? null,
    dolilArea: fields.dolilArea ?? null,
    dolilAreaUnit: fields.dolilAreaUnit ?? null,
    actualArea: fields.actualArea ?? null,
    actualAreaUnit: fields.actualAreaUnit ?? null,
    village: fields.village ?? null,
    mutationNumber: fields.mutationNumber ?? null,
    purchasePrice: fields.purchasePrice ?? null,
    purchaseDate: fields.purchaseDate ?? null,
    currentEstimatedValue: fields.currentEstimatedValue ?? null,
    notes: fields.notes ?? null,
    updatedAt: Date.now(),
  });
}

export async function saveGuestPlotBoundary(
  id: string,
  points: LatLng[],
): Promise<{ error?: string }> {
  if (points.length < 3) {
    return { error: "Need at least 3 points to form a boundary" };
  }
  const polygon: Polygon = pointsToPolygon(points);
  await db.guestPlots.update(id, {
    boundaryGeojson: polygon,
    areaSqMeters: polygonAreaSqMeters(points),
    updatedAt: Date.now(),
  });
  return {};
}

export async function deleteGuestPlot(id: string): Promise<void> {
  await db.guestPlots.delete(id);
}

export async function clearGuestPlots(ids: string[]): Promise<void> {
  await db.guestPlots.bulkDelete(ids);
}
