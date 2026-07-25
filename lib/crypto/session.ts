"use client";

/**
 * Holds the unwrapped DEK in memory only, for the lifetime of the tab. Never
 * persisted (sessionStorage/IndexedDB) — a CryptoKey can't be serialized
 * anyway, and re-deriving from the passphrase each unlock is the point.
 */

let dek: CryptoKey | null = null;
const listeners = new Set<() => void>();

export function setSessionDEK(key: CryptoKey) {
  dek = key;
  listeners.forEach((cb) => cb());
}

export function getSessionDEK(): CryptoKey | null {
  return dek;
}

export function lockSession() {
  dek = null;
  listeners.forEach((cb) => cb());
}

export function onSessionChange(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
