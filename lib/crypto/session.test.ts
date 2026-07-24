import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeKey = { type: "secret" } as unknown as CryptoKey;
const fakeKey2 = { type: "secret2" } as unknown as CryptoKey;

describe("session DEK store", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("starts with no DEK", async () => {
    const { getSessionDEK } = await import("./session");
    expect(getSessionDEK()).toBeNull();
  });

  it("setSessionDEK stores the key, getSessionDEK returns it", async () => {
    const { setSessionDEK, getSessionDEK } = await import("./session");
    setSessionDEK(fakeKey);
    expect(getSessionDEK()).toBe(fakeKey);
  });

  it("lockSession clears the key", async () => {
    const { setSessionDEK, getSessionDEK, lockSession } = await import("./session");
    setSessionDEK(fakeKey);
    lockSession();
    expect(getSessionDEK()).toBeNull();
  });

  it("setSessionDEK overwrites a previously set key", async () => {
    const { setSessionDEK, getSessionDEK } = await import("./session");
    setSessionDEK(fakeKey);
    setSessionDEK(fakeKey2);
    expect(getSessionDEK()).toBe(fakeKey2);
  });

  it("notifies listeners on set and lock", async () => {
    const { setSessionDEK, lockSession, onSessionChange } = await import("./session");
    const cb = vi.fn();
    onSessionChange(cb);
    setSessionDEK(fakeKey);
    expect(cb).toHaveBeenCalledTimes(1);
    lockSession();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("does not notify a listener after it unsubscribes", async () => {
    const { setSessionDEK, onSessionChange } = await import("./session");
    const cb = vi.fn();
    const unsubscribe = onSessionChange(cb);
    unsubscribe();
    setSessionDEK(fakeKey);
    expect(cb).not.toHaveBeenCalled();
  });

  it("supports multiple independent listeners", async () => {
    const { setSessionDEK, onSessionChange } = await import("./session");
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    onSessionChange(cb1);
    onSessionChange(cb2);
    setSessionDEK(fakeKey);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribing one listener does not affect others", async () => {
    const { setSessionDEK, onSessionChange } = await import("./session");
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsubscribe1 = onSessionChange(cb1);
    onSessionChange(cb2);
    unsubscribe1();
    setSessionDEK(fakeKey);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("calling the unsubscribe function twice is a no-op", async () => {
    const { setSessionDEK, onSessionChange } = await import("./session");
    const cb = vi.fn();
    const unsubscribe = onSessionChange(cb);
    unsubscribe();
    unsubscribe();
    setSessionDEK(fakeKey);
    expect(cb).not.toHaveBeenCalled();
  });
});
