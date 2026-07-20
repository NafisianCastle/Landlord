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

const db = new Dexie("landly") as Dexie & {
  walkSessions: EntityTable<WalkSession, "id">;
  walkPoints: EntityTable<WalkPoint, "id">;
};

db.version(1).stores({
  walkSessions: "id, plotId, status",
  walkPoints: "++id, sessionId, [sessionId+seq], synced",
});

export default db;
