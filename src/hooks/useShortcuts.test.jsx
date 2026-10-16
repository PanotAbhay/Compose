import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, fireEvent } from "@testing-library/react";
import { useShortcuts } from "./useShortcuts.js";

function setup(extra = {}) {
  const h = {
    selected: null,
    onEscape: vi.fn(),
    onLeaveText: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onShortcuts: vi.fn(),
    onSelectSibling: vi.fn(),
    onEditBlock: vi.fn(),
    onMoveBlock: vi.fn(),
    onDuplicateBlock: vi.fn(),
    onDeleteBlock: vi.fn(),
    ...extra,
  };
  renderHook(() => useShortcuts(h));
  return h;
}

function add(html) {
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild;
}

describe("useShortcuts", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("undoes and redoes the document from the page", () => {
    const h = setup();
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: "y", metaKey: true });
    expect(h.onUndo).toHaveBeenCalledTimes(1);
    expect(h.onRedo).toHaveBeenCalledTimes(2);
  });

  it("leaves Ctrl+Z in a text box to the browser", () => {
    const h = setup();
    const box = add("<textarea></textarea>");
    box.focus();
    const event = fireEvent.keyDown(box, { key: "z", ctrlKey: true });
    expect(event).toBe(true);
    expect(h.onUndo).not.toHaveBeenCalled();
  });

  it("ignores keys pressed inside a dialog", () => {
    const h = setup({ selected: "b1" });
    const button = add('<div role="dialog"><button>Done</button></div>').querySelector("button");
    fireEvent.keyDown(button, { key: "z", ctrlKey: true });
    fireEvent.keyDown(button, { key: "Delete" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(h.onUndo).not.toHaveBeenCalled();
    expect(h.onDeleteBlock).not.toHaveBeenCalled();
    expect(h.onEscape).not.toHaveBeenCalled();
  });

  it("runs block commands only when a block is selected", () => {
    const idle = setup();
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "Delete" });
    expect(idle.onSelectSibling).not.toHaveBeenCalled();
    expect(idle.onDeleteBlock).not.toHaveBeenCalled();
  });

  it("maps the block keys", () => {
    const h = setup({ selected: "b1" });
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "ArrowUp", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: "d", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "Enter" });
    fireEvent.keyDown(document.body, { key: "Backspace" });
    expect(h.onSelectSibling).toHaveBeenCalledWith(1);
    expect(h.onMoveBlock).toHaveBeenCalledWith(-1);
    expect(h.onDuplicateBlock).toHaveBeenCalledTimes(1);
    expect(h.onEditBlock).toHaveBeenCalledTimes(1);
    expect(h.onDeleteBlock).toHaveBeenCalledTimes(1);
  });

  it("keeps block keys away from text and from other controls", () => {
    const h = setup({ selected: "b1" });
    const text = add('<div contenteditable="true">Hello</div>');
    fireEvent.keyDown(text, { key: "Backspace" });
    fireEvent.keyDown(text, { key: "ArrowDown" });
    const tab = add('<div role="tab" tabindex="0">Doc</div>');
    fireEvent.keyDown(tab, { key: "Enter" });
    expect(h.onDeleteBlock).not.toHaveBeenCalled();
    expect(h.onSelectSibling).not.toHaveBeenCalled();
    expect(h.onEditBlock).not.toHaveBeenCalled();
  });

  it("Esc in a block's text leaves the text; elsewhere it clears the selection", () => {
    const h = setup({ selected: "b1" });
    const text = add('<div contenteditable="true">Hello</div>');
    fireEvent.keyDown(text, { key: "Escape" });
    expect(h.onLeaveText).toHaveBeenCalledWith(text);
    expect(h.onEscape).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(h.onEscape).toHaveBeenCalledTimes(1);
  });

  it("opens the shortcuts with ? and Ctrl+/, but not while typing", () => {
    const h = setup();
    fireEvent.keyDown(document.body, { key: "?" });
    fireEvent.keyDown(document.body, { key: "/", ctrlKey: true });
    const box = add("<input />");
    fireEvent.keyDown(box, { key: "?" });
    expect(h.onShortcuts).toHaveBeenCalledTimes(2);
  });
});
