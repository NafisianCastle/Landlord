import Dexie, { type EntityTable } from "dexie";
import type { Polygon } from "geojson";

export interface WalkSession {
  id: string;
  plotId: string;
  status: "active" | "pending-finish" | "done";
  startedAt: number;
}

export interface GuestPlot {
  id: string;
  name: string;
  upazila: string | null;
  district: string | null;
  division: string | null;
  dolilArea: number | null;
  dolilAreaUnit: string | null;
  actualArea: number | null;
  actualAreaUnit: string | null;
  village: string | null;
  mutationNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentEstimatedValue: number | null;
  notes: string | null;
  boundaryGeojson: Polygon | null;
  areaSqMeters: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface GuestApartment {
  id: string;
  name: string;
  upazila: string | null;
  district: string | null;
  division: string | null;
  floor: string | null;
  size: number | null;
  sizeUnit: string | null;
  buildingName: string | null;
  unitNumber: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentEstimatedValue: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WalkPoint {
  id?: number;
  sessionId: string;
  plotId: string;
  seq: number;
  lat: number;
  lng: number;
  accuracy: number | null;
  capturedAt: number;
  synced: 0 | 1;
}

export interface OfflineArea {
  id: string;
  label: string;
  west: number;
  south: number;
  east: number;
  north: number;
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  bytesStored: number;
  downloadedAt: number;
}

const db = new Dexie("landlord") as Dexie & {
  walkSessions: EntityTable<WalkSession, "id">;
  walkPoints: EntityTable<WalkPoint, "id">;
  offlineAreas: EntityTable<OfflineArea, "id">;
  guestPlots: EntityTable<GuestPlot, "id">;
  guestApartments: EntityTable<GuestApartment, "id">;
};

db.version(1).stores({
  walkSessions: "id, plotId, status",
  walkPoints: "++id, sessionId, [sessionId+seq], synced",
});

db.version(2).stores({
  walkSessions: "id, plotId, status",
  walkPoints: "++id, sessionId, [sessionId+seq], synced",
  offlineAreas: "id, downloadedAt",
});

db.version(3).stores({
  walkSessions: "id, plotId, status",
  walkPoints: "++id, sessionId, [sessionId+seq], synced",
  offlineAreas: "id, downloadedAt",
  guestPlots: "id, createdAt",
});

db.version(4).stores({
  walkSessions: "id, plotId, status",
  walkPoints: "++id, sessionId, [sessionId+seq], synced",
  offlineAreas: "id, downloadedAt",
  guestPlots: "id, createdAt",
  guestApartments: "id, createdAt",
});

export default db;
