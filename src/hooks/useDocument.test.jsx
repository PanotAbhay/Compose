import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocument } from "./useDocument.js";

function setup() {
  const flash = vi.fn();
  const updateDoc = vi.fn();
  const doc = { id: "d1", blocks: [{ id: "p", type: "body", html: "a" }] };
  const { result } = renderHook(() => useDocument({ doc, updateDoc, flash }));
  const html = () => result.current.getBlocks()[0].html;
  return { result, flash, html };
}

describe("useDocument", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("adds no undo step for an edit that changes nothing", () => {
    const { result, flash } = setup();
    act(() => result.current.patch("p", (x) => { x.html = "a"; }));
    let undone;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBe(false);
    // Nothing to undo is information, not an error.
    expect(flash).toHaveBeenLastCalledWith("NOTHING TO UNDO");
  });

  it("keeps redo after an unchanged edit", () => {
    const { result, html } = setup();
    act(() => result.current.patch("p", (x) => { x.html = "b"; }));
    act(() => { result.current.undo(); });
    act(() => result.current.patch("p", (x) => { x.html = "a"; }));
    act(() => { result.current.redo(); });
    expect(html()).toBe("b");
  });

  it("undoes the edit in a field that still has focus, and redo brings it back", () => {
    const { result, html } = setup();
    const field = document.createElement("input");
    document.body.appendChild(field);
    // Like EditableText: the edit is saved when the field loses focus.
    field.addEventListener("blur", () => result.current.patch("p", (x) => { x.html = "typed"; }));
    field.focus();
    act(() => { result.current.undo(); });
    expect(html()).toBe("a");
    act(() => { result.current.redo(); });
    expect(html()).toBe("typed");
  });
});
