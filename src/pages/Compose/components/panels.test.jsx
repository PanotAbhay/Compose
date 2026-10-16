import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TEMPLATES } from "../../../data/index.js";
import { ElementsPanel } from "./ElementsPanel.jsx";
import { FormatToolbar } from "./FormatToolbar.jsx";
import { ModalShell } from "./ModalShell.jsx";
import { IconRail } from "./IconRail.jsx";
import { DocTabs } from "./DocTabs.jsx";
import { TopBar } from "./TopBar.jsx";

describe("ModalShell", () => {
  it("behaves as a modal dialog: focus moves in, Escape closes, focus returns", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(
      <ModalShell variant="import" label="Import article" onClose={onClose}>
        <textarea data-autofocus="" />
        <button>Done</button>
      </ModalShell>
    );
    const dialog = screen.getByRole("dialog", { name: "Import article" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement.tagName).toBe("TEXTAREA");

    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("keeps Tab inside the dialog", () => {
    render(
      <ModalShell variant="settings" label="Settings" onClose={vi.fn()}>
        <button>First</button>
        <button>Last</button>
      </ModalShell>
    );
    screen.getByText("Last").focus();
    fireEvent.keyDown(document.activeElement, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("First"));
    fireEvent.keyDown(document.activeElement, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText("Last"));
  });

  it("isn't modal when docked, so the page stays usable", () => {
    render(<ModalShell variant="settings" docked label="Settings" onClose={vi.fn()}><button>Done</button></ModalShell>);
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBeNull();
  });
});

describe("IconRail", () => {
  it("names every button and opens it from the keyboard", () => {
    const onImport = vi.fn();
    render(<IconRail panelOpen onTogglePanel={vi.fn()} onTemplates={vi.fn()} onImport={onImport} onUndo={vi.fn()} onRedo={vi.fn()} onExport={vi.fn()} onSettings={vi.fn()} onReset={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Import an article" });
    expect(button.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Hide elements" }).getAttribute("aria-expanded")).toBe("true");
  });
});

describe("DocTabs", () => {
  const docs = [
    { id: "a", title: "First", templateKey: "news" },
    { id: "b", title: "Second", templateKey: "lab" },
  ];

  it("is a tab list you can move through with the arrow keys", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<DocTabs docs={docs} activeId="a" onSelect={onSelect} onClose={onClose} onNew={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("b");
    fireEvent.keyDown(tabs[0], { key: "Delete" });
    expect(onClose).toHaveBeenCalledWith(docs[0]);
    expect(screen.getByRole("button", { name: "Close First" })).toBeTruthy();
  });
});

describe("TopBar", () => {
  const bar = (props) => render(<TopBar docTitle="Story" onDocTitle={vi.fn()} zoom={0.75} onZoomIn={vi.fn()} onZoomOut={vi.fn()} onImport={vi.fn()} {...props} />);

  it("shows an UNDO offer beside the note and announces the note", () => {
    const onNoteAction = vi.fn();
    bar({ note: "DELETED TABLE", noteAction: { label: "UNDO" }, onNoteAction });
    fireEvent.click(screen.getByRole("button", { name: "UNDO" }));
    expect(onNoteAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("DELETED TABLE");
  });

  it("says when the work isn't being saved", () => {
    bar({ saveState: "failed" });
    expect(screen.getByText("Not saved — storage full")).toBeTruthy();
  });

  it("commits the title on Enter and puts it back on Escape", () => {
    const onDocTitle = vi.fn();
    bar({ onDocTitle });
    const title = screen.getByRole("textbox", { name: "Document title" });
    expect(title.textContent).toBe("Story");
    title.focus();
    title.textContent = "Changed";
    fireEvent.keyDown(title, { key: "Escape" });
    expect(title.textContent).toBe("Story");
  });
});

describe("ElementsPanel", () => {
  const panel = (key) => render(<ElementsPanel open allowed={TEMPLATES[key].blocks} onInsert={vi.fn()} onDragStart={vi.fn()} onDragEnd={vi.fn()} />);

  it("offers code and the structure group in the Lab manual only", () => {
    const { container, unmount } = panel("lab");
    expect(screen.getByText("Code listing")).toBeTruthy();
    expect(screen.getByText("STRUCTURE")).toBeTruthy();
    ["Chapter", "Appendix", "Contents"].forEach((label) => expect(screen.getByText(label)).toBeTruthy());
    expect(container.textContent).toContain("Code listing");
    unmount();

    ["latex", "news"].forEach((key) => {
      const { container: other, unmount: done } = panel(key);
      expect(other.textContent).not.toContain("Code listing");
      expect(other.textContent).not.toContain("STRUCTURE");
      done();
    });
  });

  it("filters by search and inserts on click", () => {
    const onInsert = vi.fn();
    const { container } = render(<ElementsPanel open allowed={TEMPLATES.lab.blocks} onInsert={onInsert} onDragStart={vi.fn()} onDragEnd={vi.fn()} />);
    fireEvent.change(container.querySelector("input"), { target: { value: "appendix" } });
    const items = container.querySelectorAll(".elements-item");
    expect(items).toHaveLength(1);
    fireEvent.click(within(items[0]).getByText("Appendix"));
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ type: "appendix" }));
  });

  it("adds the first match on Enter, and says when nothing matches", () => {
    const onInsert = vi.fn();
    render(<ElementsPanel open allowed={TEMPLATES.news.blocks} onInsert={onInsert} onDragStart={vi.fn()} onDragEnd={vi.fn()} />);
    const search = screen.getByRole("textbox", { name: /Search elements/ });
    fireEvent.change(search, { target: { value: "bar chart" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ type: "chart" }));

    // The how-to hints ("click to insert…") no longer match every element.
    fireEvent.change(search, { target: { value: "click" } });
    expect(screen.getByText(/NO ELEMENTS MATCH/)).toBeTruthy();
  });

  it("takes the closed panel out of the tab order", () => {
    const { container } = render(<ElementsPanel open={false} allowed={TEMPLATES.news.blocks} onInsert={vi.fn()} onDragStart={vi.fn()} onDragEnd={vi.fn()} />);
    expect(container.querySelector("aside").hasAttribute("inert")).toBe(true);
  });
});

describe("FormatToolbar", () => {
  afterEach(() => vi.restoreAllMocks());

  it("wraps the selection as escaped inline code", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "a < b" });
    render(<FormatToolbar bar={{ x: 100, y: 100 }} zoom={1} />);
    fireEvent.click(screen.getByTitle("Inline code"));
    expect(exec).toHaveBeenCalledWith("insertHTML", false, expect.stringContaining("<code"));
    expect(exec.mock.calls[0][2]).toContain("a &lt; b");
  });

  it("does nothing without a selection", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "" });
    render(<FormatToolbar bar={{ x: 0, y: 0 }} zoom={1} />);
    fireEvent.click(screen.getByTitle("Inline code"));
    expect(exec).not.toHaveBeenCalled();
  });
});
