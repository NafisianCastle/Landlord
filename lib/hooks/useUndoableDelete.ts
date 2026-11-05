"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const UNDO_WINDOW_MS = 5000;

/**
 * Delete with an Undo window: the row disappears at once, the real delete
 * runs after UNDO_WINDOW_MS unless undone. Leaving the page (unmount or
 * pagehide) commits pending deletes immediately rather than dropping them.
 * On failure the row comes back and onError gets the message.
 */
export function useUndoableDelete(
  commit: (id: string) => Promise<{ error?: string } | undefined | void>,
  onError: (message: string) => void,
) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [last, setLast] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const commitRef = useRef(commit);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    commitRef.current = commit;
    onErrorRef.current = onError;
  });

  const restore = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const run = useCallback(
    async (id: string) => {
      timers.current.delete(id);
      setLast((current) => (current === id ? null : current));
      try {
        const result = await commitRef.current(id);
        if (result && result.error) {
          restore(id);
          onErrorRef.current(result.error);
        }
      } catch (e) {
        restore(id);
        onErrorRef.current(e instanceof Error ? e.message : String(e));
      }
    },
    [restore],
  );

  const remove = useCallback(
    (id: string) => {
      setHidden((prev) => new Set(prev).add(id));
      setLast(id);
      timers.current.set(id, setTimeout(() => void run(id), UNDO_WINDOW_MS));
    },
    [run],
  );

  const undo = useCallback(() => {
    if (!last) return;
    clearTimeout(timers.current.get(last));
    timers.current.delete(last);
    restore(last);
    setLast(null);
  }, [last, restore]);

  useEffect(() => {
    const pending = timers.current;
    const flush = () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void run(id);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [run]);

  return { hidden, pendingUndo: last !== null, remove, undo };
}
