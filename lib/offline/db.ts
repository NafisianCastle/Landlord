import Dexie, { type EntityTable } from "dexie";

export interface WalkSession {
  id: string;
  plotId: string;
  status: "active" | "pending-finish" | "done";
  startedAt: number;
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

export default db;
