import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";
import { STORAGE_KEYS } from "./data/index.js";

function app() {
  return render(<MemoryRouter><App /></MemoryRouter>);
}

describe("App", () => {
  it("asks for a template on first launch and opens its starter page", () => {
    const { container } = app();
    expect(container.querySelector(".canvas")).toBeNull();
    fireEvent.click(screen.getAllByText("Lab manual")[0]);
    expect(container.querySelector(".canvas")).toBeTruthy();
    expect(container.querySelectorAll(".nt-blk").length).toBeGreaterThan(3);
  });

  it("restores a saved Lab manual with chapters, code and contents in A4 pages", () => {
    const blocks = [
      { id: "h1", type: "h1", html: "Lab Manual" },
      { id: "toc", type: "toc", a: "Contents" },
      { id: "c1", type: "chapter", html: "Introduction" },
      { id: "code", type: "code", lang: "sql", a: "q", text: "SELECT 1;" },
      { id: "a1", type: "appendix", html: "Scripts" },
    ];
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify({ docs: [{ id: "d1", title: "Lab", templateKey: "lab", blocks, layout: "print-1" }], activeId: "d1" }));
    const { container } = app();
    expect(screen.getByText("Chapter 1")).toBeTruthy();
    expect(screen.getByText("Appendix A")).toBeTruthy();
    expect(container.querySelectorAll("[data-page]").length).toBe(4);
    expect(screen.getByText("Code listing")).toBeTruthy();
  });

  it("inserts a chapter from the palette", () => {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify({ docs: [{ id: "d1", title: "Lab", templateKey: "lab", blocks: [{ id: "h1", type: "h1", html: "T" }, { id: "p", type: "body", html: "x" }], layout: "web" }], activeId: "d1" }));
    const { container } = app();
    fireEvent.click(screen.getByText("Chapter"));
    expect(container.querySelector('[data-type="chapter"]')).toBeTruthy();
    expect(screen.getByText("Chapter 1")).toBeTruthy();
  });

  it("ignores a corrupt saved workspace", () => {
    localStorage.setItem(STORAGE_KEYS.workspace, "{not json");
    expect(() => app()).not.toThrow();
    expect(screen.getAllByText("Lab manual").length).toBeGreaterThan(0);
  });

  const TWO_TABS = {
    docs: [
      { id: "d1", title: "First", templateKey: "news", blocks: [{ id: "h1", type: "h1", html: "T" }, { id: "q", type: "quote", a: "Said", b: "Someone" }], layout: "web" },
      { id: "d2", title: "Second", templateKey: "news", blocks: [{ id: "h1b", type: "h1", html: "U" }], layout: "web" },
    ],
    activeId: "d1",
  };

  it("closes a tab without asking, and UNDO brings it back", () => {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(TWO_TABS));
    const confirm = vi.spyOn(window, "confirm");
    app();
    fireEvent.click(screen.getByRole("button", { name: "Close First" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("tab", { name: /First/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "UNDO" }));
    expect(screen.getByRole("tab", { name: /First/ }).getAttribute("aria-selected")).toBe("true");
    confirm.mockRestore();
  });

  it("deletes a block with the keyboard and offers UNDO", () => {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(TWO_TABS));
    const { container } = app();
    fireEvent.click(container.querySelector('[data-type="quote"]'));
    fireEvent.keyDown(document.body, { key: "Delete" });
    expect(container.querySelector('[data-type="quote"]')).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("DELETED PULL QUOTE");
    fireEvent.click(screen.getByRole("button", { name: "UNDO" }));
    expect(container.querySelector('[data-type="quote"]')).toBeTruthy();
  });

  it("says so when autosave fails", () => {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(TWO_TABS));
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    app();
    expect(screen.getByText("Not saved — storage full")).toBeTruthy();
    setItem.mockRestore();
  });

  it("opens the keyboard shortcuts with ?", () => {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(TWO_TABS));
    app();
    fireEvent.keyDown(document.body, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).toBeNull();
  });
});
