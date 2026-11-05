import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UNDO_WINDOW_MS, useUndoableDelete } from "./useUndoableDelete";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(commit = vi.fn().mockResolvedValue({ success: true })) {
  const onError = vi.fn();
  const hook = renderHook(() => useUndoableDelete(commit, onError));
  return { commit, onError, ...hook };
}

describe("useUndoableDelete", () => {
  it("hides at once and commits only after the undo window", async () => {
    const { commit, result } = setup();
    act(() => result.current.remove("a"));
    expect(result.current.hidden.has("a")).toBe(true);
    expect(result.current.pendingUndo).toBe(true);
    expect(commit).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(UNDO_WINDOW_MS));
    expect(commit).toHaveBeenCalledWith("a");
    expect(result.current.pendingUndo).toBe(false);
  });

  it("undo restores the row and never commits", async () => {
    const { commit, result } = setup();
    act(() => result.current.remove("a"));
    act(() => result.current.undo());
    expect(result.current.hidden.has("a")).toBe(false);
    await act(async () => vi.advanceTimersByTime(UNDO_WINDOW_MS * 2));
    expect(commit).not.toHaveBeenCalled();
  });

  it("brings the row back and reports a failed delete", async () => {
    const { onError, result } = setup(vi.fn().mockResolvedValue({ error: "Not allowed" }));
    act(() => result.current.remove("a"));
    await act(async () => vi.advanceTimersByTime(UNDO_WINDOW_MS));
    expect(result.current.hidden.has("a")).toBe(false);
    expect(onError).toHaveBeenCalledWith("Not allowed");
  });

  it("commits pending deletes when the user leaves instead of dropping them", () => {
    const { commit, result, unmount } = setup();
    act(() => result.current.remove("a"));
    unmount();
    expect(commit).toHaveBeenCalledWith("a");
  });
});
