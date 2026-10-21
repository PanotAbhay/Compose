import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NEW_BLOCK, TEMPLATES, TEMPLATE_KEYS, TEXTISH_TYPES, PROSE_TYPES } from "../../../../data/index.js";
import { BlockFrame } from "../BlockFrame.jsx";
import { CodeBlock } from "./CodeBlock.jsx";
import { ChapterBlock } from "./ChapterBlock.jsx";
import { TocBlock } from "./TocBlock.jsx";
import { PgfPlot } from "./PgfPlot.jsx";
import { EditableText } from "./EditableText.jsx";
import { parseValue } from "./articleStyles.js";

const TEXT_SAMPLES = {
  h1: { type: "h1", html: "Headline" },
  standfirst: { type: "standfirst", html: "Standfirst" },
};

function frame(block, theme, extra = {}) {
  const props = {
    block: { id: "b1", ...block },
    index: 0,
    sectionSize: 1,
    selected: false,
    inLive: false,
    building: false,
    allowed: Object.keys(NEW_BLOCK),
    theme,
    number: "2",
    outline: [],
    slice: null,
    readTime: 3,
    onSelect: vi.fn(),
    onPatch: vi.fn(),
    onDelete: vi.fn(),
    onDeleteSection: vi.fn(),
    onDuplicate: vi.fn(),
    onMoveStart: vi.fn(),
    onDragEnd: vi.fn(),
    onNotice: vi.fn(),
    ...extra,
  };
  return { ...render(<BlockFrame {...props} />), props };
}

// Applying an onPatch updater to a copy shows what the block would become.
function patched(onPatch, block) {
  const copy = JSON.parse(JSON.stringify(block));
  onPatch.mock.calls.at(-1)[0](copy);
  return copy;
}

describe("every block type renders in every template", () => {
  // Prose (body, dropcap) renders through Canvas as one ProseBlock, never a BlockFrame.
  const types = [...Object.keys(NEW_BLOCK).filter((t) => !PROSE_TYPES.includes(t)), "h1", "standfirst"];
  TEMPLATE_KEYS.forEach((key) => {
    types.forEach((type) => {
      it(key + " · " + type, () => {
        const block = NEW_BLOCK[type] ? NEW_BLOCK[type]() : TEXT_SAMPLES[type];
        [1, 2].forEach((pageColumns) => {
          const { container, unmount } = frame(block, { ...TEMPLATES[key].theme, pageColumns }, { selected: true });
          const el = container.querySelector("[data-type]");
          expect(el.getAttribute("data-type")).toBe(type);
          expect(el.getAttribute("data-unit")).toBe("b1");
          unmount();
        });
      });
    });
  });

  it("renders a block with every optional field missing", () => {
    ["chart", "line", "poll", "table", "stats", "timeline", "nutshell", "image", "code", "toc", "chapter"].forEach((type) => {
      const { unmount } = frame({ type }, TEMPLATES.latex.theme);
      unmount();
    });
  });
});

describe("BlockFrame chrome", () => {
  it("offers section actions for chapters as for sub-headings", () => {
    const { props } = frame(NEW_BLOCK.chapter(), TEMPLATES.lab.theme, { selected: true, sectionSize: 4 });
    expect(screen.getByText("SECTION · 4 BLOCKS")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete section"));
    expect(props.onDeleteSection).toHaveBeenCalledWith("b1");
  });

  it("shows the type menu only for text blocks", () => {
    const { container } = frame(NEW_BLOCK.code(), TEMPLATES.lab.theme, { selected: true });
    expect(container.querySelector(".block-type-select")).toBeNull();
    expect(TEXTISH_TYPES).not.toContain("code");
  });
});

describe("CodeBlock", () => {
  const block = { id: "c1", type: "code", lang: "sql", a: "tables.sql", text: "SELECT 1;\n\nFROM t;" };

  it("numbers every line, blank ones included", () => {
    const { container } = render(<CodeBlock block={block} theme={{}} onPatch={vi.fn()} />);
    const lines = container.querySelectorAll("[data-split-lines] > div");
    expect(lines).toHaveLength(3);
    expect(Array.from(lines).map((l) => l.firstChild.textContent)).toEqual(["1", "2", "3"]);
    expect(screen.getByText("tables.sql")).toBeTruthy();
  });

  it("switches to plain-text editing on click and saves on blur", () => {
    const onPatch = vi.fn();
    const { container } = render(<CodeBlock block={block} theme={{}} onPatch={onPatch} />);
    fireEvent.click(container.querySelector("[data-split-lines]"));
    const textarea = container.querySelector("textarea");
    expect(textarea.value).toBe(block.text);
    expect(container.querySelector("select.code-lang")).toBeTruthy();
    fireEvent.change(textarea, { target: { value: "SELECT 2;\n\n" } });
    fireEvent.blur(textarea);
    expect(patched(onPatch, block).text).toBe("SELECT 2;");
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("doesn't save an unchanged listing", () => {
    const onPatch = vi.fn();
    const { container } = render(<CodeBlock block={block} theme={{}} onPatch={onPatch} />);
    fireEvent.click(container.querySelector("[data-split-lines]"));
    fireEvent.blur(container.querySelector("textarea"));
    expect(onPatch).not.toHaveBeenCalled();
  });

  it("changes the language from the picker", () => {
    const onPatch = vi.fn();
    const { container } = render(<CodeBlock block={block} theme={{}} onPatch={onPatch} />);
    fireEvent.click(container.querySelector("[data-split-lines]"));
    fireEvent.change(container.querySelector("select.code-lang"), { target: { value: "python" } });
    expect(patched(onPatch, block).lang).toBe("python");
  });

  it("draws a slice of a split listing", () => {
    const { container } = render(<CodeBlock block={block} theme={{}} slice={{ skip: 40, clip: 100 }} onPatch={vi.fn()} />);
    expect(container.firstChild.style.height).toBe("100px");
    expect(container.firstChild.style.overflow).toBe("hidden");
    expect(container.querySelector("[data-split]").style.marginTop).toBe("-40px");
  });

  it("hides an empty caption until editing", () => {
    const { container } = render(<CodeBlock block={{ ...block, a: "" }} theme={{}} onPatch={vi.fn()} />);
    expect(container.querySelector("[data-ph='Listing title']")).toBeNull();
    fireEvent.click(container.querySelector("[data-split-lines]"));
    expect(container.querySelector("[data-ph='Listing title']")).toBeTruthy();
  });

  it("renders an empty listing as one line", () => {
    const { container } = render(<CodeBlock block={{ id: "c", type: "code" }} theme={{}} onPatch={vi.fn()} />);
    expect(container.querySelectorAll("[data-split-lines] > div")).toHaveLength(1);
  });
});

describe("ChapterBlock", () => {
  it("labels chapters and appendices with their numbers", () => {
    render(<ChapterBlock block={{ id: "c", type: "chapter", html: "Joins" }} theme={{}} number="3" onPatch={vi.fn()} />);
    expect(screen.getByText("Chapter 3")).toBeTruthy();
    render(<ChapterBlock block={{ id: "a", type: "appendix", html: "Scripts" }} theme={{}} number="B" onPatch={vi.fn()} />);
    expect(screen.getByText("Appendix B")).toBeTruthy();
  });
});

describe("TocBlock", () => {
  const outline = [
    { id: "c1", type: "chapter", number: "1", text: "Introduction", page: 3 },
    { id: "s1", type: "h2", number: undefined, text: "1.1 Tools", page: 3 },
    { id: "s2", type: "h3", number: undefined, text: "1.1.1 MySQL", page: 4 },
    { id: "a1", type: "appendix", number: "A", text: "Scripts", page: 9 },
  ];

  it("lists chapters bold with page numbers and leaders under them", () => {
    const { container } = render(<TocBlock block={{ id: "t", type: "toc", a: "Contents" }} theme={{}} outline={outline} onPatch={vi.fn()} />);
    const rows = container.querySelectorAll("[data-split-lines] > div");
    expect(rows).toHaveLength(4);
    expect(rows[0].style.fontWeight).toBe("700");
    expect(rows[0].textContent).toBe("1Introduction3");
    expect(rows[1].style.paddingLeft).toBe("1.5em");
    expect(rows[2].style.paddingLeft).toBe("3.5em");
    expect(rows[1].textContent).toContain(" . .");
    expect(rows[3].textContent).toContain("A");
  });

  it("leaves out page numbers on the web layout", () => {
    const web = outline.map((o) => ({ ...o, page: undefined }));
    const { container } = render(<TocBlock block={{ id: "t", type: "toc", a: "Contents" }} theme={{}} outline={web} onPatch={vi.fn()} />);
    expect(container.querySelector("[data-split-lines] > div").textContent).toBe("1Introduction");
  });

  it("treats sub-headings as the top level when there are no chapters", () => {
    const flat = [{ id: "s1", type: "h2", number: "1", text: "Method", page: 1 }, { id: "s2", type: "h3", number: "1.1", text: "Data", page: 1 }];
    const { container } = render(<TocBlock block={{ id: "t", type: "toc", a: "Contents" }} theme={{}} outline={flat} onPatch={vi.fn()} />);
    const rows = container.querySelectorAll("[data-split-lines] > div");
    expect(rows[0].style.fontWeight).toBe("700");
    expect(rows[1].style.paddingLeft).toBe("1.5em");
  });

  it("explains what to add when there is nothing to list", () => {
    render(<TocBlock block={{ id: "t", type: "toc", a: "Contents" }} theme={{}} outline={[]} onPatch={vi.fn()} />);
    expect(screen.getByText(/Add chapters or sub-headings/)).toBeTruthy();
  });
});

describe("PgfPlot tick labels", () => {
  const block = { id: "p", type: "chart", a: "Speed", b: "x", bars: [{ label: "LIGHTWEIGHT MODEL", value: 5 }, { label: "RESNET-50 ENCODER", value: 1 }] };
  const label = (container) => container.querySelector("[data-ph='label']");

  it("rotates long labels in two columns, as the export does", () => {
    const { container } = render(<PgfPlot kind="bar" block={block} columns={2} onPatch={vi.fn()} />);
    expect(label(container).style.transform).toContain("rotate(-45deg)");
  });

  it("keeps them flat in one column", () => {
    const { container } = render(<PgfPlot kind="bar" block={block} columns={1} onPatch={vi.fn()} />);
    expect(label(container).style.transform).not.toContain("rotate");
  });

  it("draws an empty chart without crashing", () => {
    expect(() => render(<PgfPlot kind="line" block={{ id: "e", bars: [] }} onPatch={vi.fn()} />)).not.toThrow();
  });
});

describe("EditableText", () => {
  it("commits on blur only when the text changed", () => {
    const onCommit = vi.fn();
    const { container } = render(<EditableText value="Same" onCommit={onCommit} />);
    const el = container.firstChild;
    fireEvent.blur(el);
    expect(onCommit).not.toHaveBeenCalled();
    el.innerText = "Changed";
    fireEvent.blur(el);
    expect(onCommit).toHaveBeenCalledWith("Changed");
  });
});

describe("parseValue", () => {
  it("reads a number past units, keeping the sign only when asked", () => {
    expect(parseValue("12.5%")).toBe(12.5);
    expect(parseValue("-3 pts")).toBe(3);
    expect(parseValue("-3 pts", true)).toBe(-3);
    expect(parseValue("n/a")).toBe(0);
  });
});
