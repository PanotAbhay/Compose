import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlash } from "./useFlash.js";

describe("useFlash", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("clears a note after a few seconds, and keeps errors up longer", () => {
    const { result } = renderHook(() => useFlash());
    act(() => result.current.flash("SAVED"));
    act(() => vi.advanceTimersByTime(3300));
    expect(result.current.note).toBe("");

    act(() => result.current.flash("FAILED", true));
    act(() => vi.advanceTimersByTime(3300));
    expect(result.current.note).toBe("FAILED");
    expect(result.current.noteErr).toBe(true);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.note).toBe("");
  });

  it("runs the offered action once and clears the note", () => {
    const run = vi.fn();
    const { result } = renderHook(() => useFlash());
    act(() => result.current.flash("DELETED TABLE", false, { label: "UNDO", run }));
    expect(result.current.noteAction.label).toBe("UNDO");
    act(() => result.current.runAction());
    expect(run).toHaveBeenCalledTimes(1);
    expect(result.current.note).toBe("");
    expect(result.current.noteAction).toBeNull();
  });
});
