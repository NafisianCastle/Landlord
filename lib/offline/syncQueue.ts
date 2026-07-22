"use client";

import db, { type WalkPoint } from "./db";
import { createClient } from "@/lib/supabase/client";
import { savePlotBoundary } from "@/app/actions/plots";

type Listener = () => void;
const listeners = new Set<Listener>();

export function onSyncStateChange(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

export async function pendingCount(plotId?: string): Promise<number> {
  const unsynced = await db.walkPoints.where("synced").equals(0).toArray();
  return plotId ? unsynced.filter((p) => p.plotId === plotId).length : unsynced.length;
}

/** Resumes the most recent unfinished walk for this plot, or starts a new one. */
export async function resumeOrCreateSession(plotId: string) {
  const existing = await db.walkSessions
    .where("plotId")
    .equals(plotId)
    .and((s) => s.status !== "done")
    .last();

  if (existing) {
    const points = await db.walkPoints
      .where("sessionId")
      .equals(existing.id)
      .sortBy("seq");
    return { session: existing, points };
  }

  const session = {
    id: crypto.randomUUID(),
    plotId,
    status: "active" as const,
    startedAt: Date.now(),
  };
  await db.walkSessions.add(session);
  return { session, points: [] as WalkPoint[] };
}

export async function recordPoint(
  sessionId: string,
  plotId: string,
  seq: number,
  lat: number,
  lng: number,
  accuracy: number | null,
) {
  await db.walkPoints.add({
    sessionId,
    plotId,
    seq,
    lat,
    lng,
    accuracy,
    capturedAt: Date.now(),
    synced: 0,
  });
  notify();
  void syncPending();
}

export async function undoLastPoint(sessionId: string) {
  const last = await db.walkPoints.where("sessionId").equals(sessionId).last();
  if (last?.id !== undefined) {
    await db.walkPoints.delete(last.id);
  }
  notify();
}

/**
 * Removes an arbitrary point (not just the last one) and renumbers the rest
 * to stay contiguous 0..n-1 — `seq` doubles as the array index the UI relies
 * on, and the remote audit table's uniqueness is keyed on (session_id, seq),
 * so gaps or duplicate seqs after a mid-walk delete would corrupt both.
 * Renumbered rows are marked unsynced so the audit trail re-uploads under
 * their new seq.
 */
export async function deletePointAt(sessionId: string, index: number) {
  const points = await db.walkPoints.where("sessionId").equals(sessionId).sortBy("seq");
  const remaining = points.filter((_, i) => i !== index);
  const toDelete = points[index];

  await db.transaction("rw", db.walkPoints, async () => {
    if (toDelete?.id !== undefined) await db.walkPoints.delete(toDelete.id);
    await Promise.all(
      remaining.map((p, i) =>
        p.id !== undefined && p.seq !== i
          ? db.walkPoints.update(p.id, { seq: i, synced: 0 })
          : Promise.resolve(),
      ),
    );
  });

  notify();
  void syncPending();
}

/** Marks a walk as ready to finalize — synced immediately if online, otherwise queued. */
export async function finishSession(plotId: string, sessionId: string) {
  await db.walkSessions.update(sessionId, { status: "pending-finish" });
  notify();
  return syncPending();
}

/**
 * Pushes captured points to plot_boundary_points (audit trail, idempotent via
 * unique(session_id, seq)) and finalizes any session marked pending-finish by
 * calling the upsert_plot_boundary RPC with its locally-held points. Safe to
 * call repeatedly — a no-op when offline or nothing is pending.
 */
export async function syncPending(): Promise<{ finished: string[] }> {
  const finished: string[] = [];
  if (typeof navigator !== "undefined" && !navigator.onLine) return { finished };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { finished };

  const unsynced = await db.walkPoints.where("synced").equals(0).toArray();
  const bySession = new Map<string, WalkPoint[]>();
  for (const point of unsynced) {
    const list = bySession.get(point.sessionId) ?? [];
    list.push(point);
    bySession.set(point.sessionId, list);
  }

  for (const [sessionId, points] of bySession) {
    const { error } = await supabase.from("plot_boundary_points").upsert(
      points.map((p) => ({
        plot_id: p.plotId,
        user_id: user.id,
        session_id: sessionId,
        seq: p.seq,
        lat: p.lat,
        lng: p.lng,
        accuracy_meters: p.accuracy,
        captured_at: new Date(p.capturedAt).toISOString(),
      })),
      { onConflict: "session_id,seq", ignoreDuplicates: true },
    );
    if (!error) {
      const ids = points.map((p) => p.id).filter((id): id is number => id !== undefined);
      await db.walkPoints.bulkUpdate(ids.map((id) => ({ key: id, changes: { synced: 1 } })));
    }
  }

  const pendingFinishSessions = await db.walkSessions
    .where("status")
    .equals("pending-finish")
    .toArray();

  for (const session of pendingFinishSessions) {
    const points = await db.walkPoints
      .where("sessionId")
      .equals(session.id)
      .sortBy("seq");
    if (points.length < 3) continue;

    const result = await savePlotBoundary(
      session.plotId,
      points.map((p) => ({ lat: p.lat, lng: p.lng })),
    );
    if (!result?.error) {
      await db.walkSessions.update(session.id, { status: "done" });
      finished.push(session.plotId);
    }
  }

  notify();
  return { finished };
}
