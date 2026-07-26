"use client";

import db, { type GuestApartment } from "./db";

export type { GuestApartment };

export interface GuestApartmentMetadataInput {
  name: string;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
  floor?: string | null;
  size?: number | null;
  sizeUnit?: string | null;
  buildingName?: string | null;
  unitNumber?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  currentEstimatedValue?: number | null;
  notes?: string | null;
}

export async function listGuestApartments(): Promise<GuestApartment[]> {
  return db.guestApartments.orderBy("createdAt").reverse().toArray();
}

export async function getGuestApartment(id: string): Promise<GuestApartment | undefined> {
  return db.guestApartments.get(id);
}

export async function createGuestApartment(
  fields: GuestApartmentMetadataInput,
): Promise<GuestApartment> {
  const now = Date.now();
  const apartment: GuestApartment = {
    id: crypto.randomUUID(),
    name: fields.name,
    upazila: fields.upazila ?? null,
    district: fields.district ?? null,
    division: fields.division ?? null,
    floor: fields.floor ?? null,
    size: fields.size ?? null,
    sizeUnit: fields.sizeUnit ?? null,
    buildingName: fields.buildingName ?? null,
    unitNumber: fields.unitNumber ?? null,
    purchasePrice: fields.purchasePrice ?? null,
    purchaseDate: fields.purchaseDate ?? null,
    currentEstimatedValue: fields.currentEstimatedValue ?? null,
    notes: fields.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.guestApartments.add(apartment);
  return apartment;
}

export async function updateGuestApartmentMetadata(
  id: string,
  fields: GuestApartmentMetadataInput,
): Promise<void> {
  await db.guestApartments.update(id, {
    name: fields.name,
    upazila: fields.upazila ?? null,
    district: fields.district ?? null,
    division: fields.division ?? null,
    floor: fields.floor ?? null,
    size: fields.size ?? null,
    sizeUnit: fields.sizeUnit ?? null,
    buildingName: fields.buildingName ?? null,
    unitNumber: fields.unitNumber ?? null,
    purchasePrice: fields.purchasePrice ?? null,
    purchaseDate: fields.purchaseDate ?? null,
    currentEstimatedValue: fields.currentEstimatedValue ?? null,
    notes: fields.notes ?? null,
    updatedAt: Date.now(),
  });
}

export async function deleteGuestApartment(id: string): Promise<void> {
  await db.guestApartments.delete(id);
}

export async function clearGuestApartments(ids: string[]): Promise<void> {
  await db.guestApartments.bulkDelete(ids);
}
