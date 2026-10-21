import { describe, it, expect } from "vitest";
import {
  sectionEnd, moveSection, moveBlock, mergeProse, plainParas, paraBlocks, splitHeadline, promptPara, isMarked,
  inlineHtml, inlineCodeHtml, escapeHtml, elementToBlock, blocksFromPlan, parseJsonReply, countWords, createStarterBlocks,
  cloneBlock, headerBlocks,
} from "./blocks.js";
import { TEMPLATES, TEMPLATE_KEYS } from "../data/index.js";

const LAB = TEMPLATES.lab.blocks;
const NEWS = TEMPLATES.news.blocks;
const b = (type, extra = {}) => ({ id: type + Math.random().toString(36).slice(2, 6), type, ...extra });
const types = (blocks) => blocks.filter(Boolean).map((x) => x.type);

describe("sectionEnd", () => {
  const doc = [b("h1"), b("chapter"), b("body"), b("h2"), b("body"), b("h3"), b("body"), b("chapter"), b("body"), b("appendix"), b("h2")];

  it("gives a chapter everything up to the next chapter or appendix", () => {
    expect(sectionEnd(doc, 1)).toBe(7);
    expect(sectionEnd(doc, 7)).toBe(9);
    expect(sectionEnd(doc, 9)).toBe(11);
  });

  it("ends a sub-heading's section at the next heading or chapter", () => {
    expect(sectionEnd(doc, 3)).toBe(5);
    expect(sectionEnd(doc, 5)).toBe(7);
  });

  it("treats other blocks as their own section", () => {
    expect(sectionEnd(doc, 2)).toBe(3);
  });

  it("moves a whole chapter, and refuses to move it into itself", () => {
    const moved = moveSection(doc, doc[7].id, 1);
    expect(moved.slice(1, 3).map((x) => x.id)).toEqual([doc[7].id, doc[8].id]);
    expect(moveSection(doc, doc[1].id, 4)).toBeNull();
  });
});

describe("moveBlock", () => {
  it("moves a block down past its own slot", () => {
    const doc = [b("body", { id: "a" }), b("body", { id: "b" }), b("body", { id: "c" })];
    expect(moveBlock(doc, "a", 3).map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(moveBlock(doc, "missing", 0)).toBeNull();
  });
});

describe("plainParas", () => {
  it("joins wrapped lines but keeps short lines apart", () => {
    const long = "This is a long line of prose that wraps onto the next line because it has";
    expect(plainParas(long + "\ncontinued words.\n\nTitle\nBy Someone")).toEqual([long + " continued words.", "Title", "By Someone"]);
  });

  it("keeps a code fence as one paragraph with its indentation and blank lines", () => {
    const paras = plainParas("Intro.\n```sql\nSELECT *\n\n  FROM t;\n```\nAfter.");
    expect(paras).toEqual(["Intro.", "```sql\nSELECT *\n\n  FROM t;\n```", "After."]);
  });

  it("closes an unterminated fence at the end of the text", () => {
    expect(plainParas("```\nSELECT 1")).toEqual(["```\nSELECT 1\n```"]);
  });

  it("never joins a long line onto a marker or heading", () => {
    const long = "A long sentence that keeps going and going without any punctuation at its end";
    expect(plainParas("## " + long + "\nnext line")).toEqual(["## " + long, "next line"]);
    expect(plainParas(long + "\n[[image 0]]")).toEqual([long, "[[image 0]]"]);
    expect(plainParas(long + "\n# Chapter 2: Title")).toEqual([long, "# Chapter 2: Title"]);
  });

  it("handles empty and missing input", () => {
    expect(plainParas("")).toEqual([]);
    expect(plainParas(null)).toEqual([]);
  });
});

describe("inline markup", () => {
  it("escapes HTML before adding bold and code", () => {
    expect(inlineHtml("a < b & **c** `x<y`")).toBe('a &lt; b &amp; <b>c</b> <code style="font-family: var(--font-mono); font-size: 0.92em">x&lt;y</code>');
  });

  it("leaves unmatched markers alone", () => {
    expect(inlineHtml("5 ** 2 and a `tick")).toBe("5 ** 2 and a `tick");
  });

  it("escapes quotes and handles empty input", () => {
    expect(escapeHtml('"x"')).toBe("&quot;x&quot;");
    expect(escapeHtml(null)).toBe("");
    expect(inlineCodeHtml("<b>")).toContain("&lt;b&gt;");
  });
});

describe("splitHeadline", () => {
  it("picks the first # heading even after a logo", () => {
    expect(splitHeadline(["[[image 0]]", "# Lab Manual", "Intro"])).toEqual({ headline: "Lab Manual", rest: ["[[image 0]]", "Intro"] });
  });

  it("skips chapter headings and falls back to the first paragraph", () => {
    expect(splitHeadline(["# Chapter 1: Intro", "Text"])).toEqual({ headline: "", rest: ["# Chapter 1: Intro", "Text"] });
    expect(splitHeadline(["```sql\nSELECT 1;\n```", "Text"]).headline).toBe("");
    expect(splitHeadline(["Plain title", "Text"])).toEqual({ headline: "Plain title", rest: ["Text"] });
    expect(splitHeadline([])).toEqual({ headline: "", rest: [] });
  });
});

describe("paraBlocks", () => {
  it("turns marked paragraphs into Lab manual blocks", () => {
    const paras = [
      "[[toc]]",
      "# Chapter 2: MySQL on the platform",
      "## 2.1 Introduction",
      "### 2.1.1 Details",
      "Listing 2.1: labtables.sql",
      "```sql\nSELECT 1;\n```",
      "[[image 0]]",
      "Figure 2.1: Login page",
      "# Appendix A: Scripts",
      "Plain **bold** text.",
    ];
    const out = paraBlocks(paras, { allowed: LAB, images: ["data:image/jpeg;base64,AAA"] });
    expect(types(out)).toEqual(["toc", "chapter", "h2", "h3", "code", "image", "appendix", "body"]);
    const code = out.find((x) => x && x.type === "code");
    expect(code).toMatchObject({ lang: "sql", a: "labtables.sql", text: "SELECT 1;" });
    const image = out.find((x) => x && x.type === "image");
    expect(image.slots).toEqual(["data:image/jpeg;base64,AAA"]);
    // the Lab manual doesn't number figures, so the caption keeps its own number
    expect(image.a).toBe("Figure 2.1: Login page");
    expect(out.find((x) => x && x.type === "h2").html).toBe("2.1 Introduction");
    expect(out.find((x) => x && x.type === "chapter").html).toBe("MySQL on the platform");
    expect(out.find((x) => x && x.type === "body").html).toBe("Plain <b>bold</b> text.");
    // every block has a unique id
    const ids = out.filter(Boolean).map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("drops the source's numbers when the template numbers headings and figures", () => {
    const out = paraBlocks(["## 2.1 Introduction", "### A.3.1 Setup", "[[image 0]]", "Figure 2.1: Login page"], { allowed: TEMPLATES.latex.blocks, numbered: true });
    expect(out[0].html).toBe("Introduction");
    expect(out[1].html).toBe("Setup");
    expect(out[2].a).toBe("Login page");
  });

  it("doesn't mistake a heading starting with a word for a number", () => {
    const out = paraBlocks(["## A sign-in page", "## 2024 results"], { allowed: LAB, numbered: true });
    expect(out.map((x) => x.html)).toEqual(["A sign-in page", "2024 results"]);
  });

  it("falls back to headings and paragraphs where the template lacks the new blocks", () => {
    const out = paraBlocks(["[[toc]]", "# Chapter 3: Joins", "```sql\nSELECT 1;\nSELECT 2;\n```", "[[image 0]]"], { allowed: NEWS });
    expect(out[0]).toBeNull();
    expect(out[1]).toMatchObject({ type: "h2", html: "Chapter 3: Joins" });
    expect(out[2].type).toBe("body");
    expect(out[2].html).toContain("<br>");
    expect(out[2].html).toContain("SELECT 1;");
    expect(out[3].type).toBe("image");
    // without pictures, the caption stays as text
    expect(types(paraBlocks(["[[image 0]]", "Figure 1: Caption"], { allowed: ["body", "h2"] }))).toEqual(["body"]);
  });

  it("keeps a listing caption as text when code isn't allowed", () => {
    const out = paraBlocks(["Listing 1: q", "```sql\nSELECT 1;\n```"], { allowed: NEWS });
    expect(types(out)).toEqual(["body", "body"]);
  });

  it("gathers bullet and numbered paragraphs into lists only when asked", () => {
    const paras = ["• one", "• two", "1. first", "2. second", "Text", "• three"];
    const lists = paraBlocks(paras, { allowed: LAB, lists: true });
    expect(types(lists)).toEqual(["bullets", "numbered", "body", "bullets"]);
    expect(lists[0].html).toBe("<li>one</li><li>two</li>");
    expect(lists[2].html).toBe("<li>first</li><li>second</li>");
    expect(types(paraBlocks(paras, { allowed: LAB }))).toEqual(["body", "body", "body", "body", "body", "body"]);
  });

  it("guesses the language of an unlabelled fence and handles an empty one", () => {
    const out = paraBlocks(["```\nimport os\nprint(os.name)\n```", "```\n\n```"], { allowed: LAB });
    expect(out[0].lang).toBe("python");
    expect(out[1].type).toBe("code");
  });

  it("leaves an image slot empty when its picture is missing", () => {
    expect(paraBlocks(["[[image 7]]"], { allowed: LAB, images: [] })[0].slots).toEqual([""]);
  });

  it("handles no paragraphs", () => {
    expect(paraBlocks([], { allowed: LAB })).toEqual([]);
  });
});

describe("promptPara / isMarked", () => {
  it("summarises code for the AI and leaves other paragraphs as they are", () => {
    expect(promptPara("```sql\na\nb\nc\n```")).toBe("```sql (3 lines of code)```");
    expect(promptPara("Hello")).toBe("Hello");
    expect(isMarked("[[toc]]")).toBe(true);
    expect(isMarked("## Heading")).toBe(true);
    expect(isMarked("Hello")).toBe(false);
  });
});

describe("elementToBlock", () => {
  it("builds the new block types from AI JSON", () => {
    expect(elementToBlock({ type: "code", text: "SELECT 1;", caption: "Query" })).toEqual({ type: "code", lang: "sql", a: "Query", text: "SELECT 1;" });
    expect(elementToBlock({ type: "chapter", text: "Joins" })).toEqual({ type: "chapter", html: "Joins" });
    expect(elementToBlock({ type: "appendix", text: "Scripts" })).toEqual({ type: "appendix", html: "Scripts" });
    expect(elementToBlock({ type: "toc" })).toEqual({ type: "toc", a: "Contents" });
  });

  it("rejects elements without their content", () => {
    expect(elementToBlock({ type: "code" })).toBeNull();
    expect(elementToBlock({ type: "chapter" })).toBeNull();
    expect(elementToBlock({ type: "table", rows: [] })).toBeNull();
    expect(elementToBlock({ type: "nonsense" })).toBeNull();
  });
});

describe("blocksFromPlan", () => {
  const paras = ["# Lab Manual", "# Chapter 1: Intro", "First paragraph.", "```sql\nSELECT 1;\n```", "## Exercises", "Do this.", "# Chapter 2: More", "## Exercises", "Do that."];

  it("converts marked paragraphs directly and keeps repeated headings", () => {
    const { blocks } = blocksFromPlan({ headline: "Lab Manual", insertions: [] }, paras, LAB);
    expect(types(blocks)).toEqual(["h1", "standfirst", "byline", "chapter", "body", "code", "h2", "body", "chapter", "h2", "body"]);
    expect(blocks.filter((x) => x.type === "h2")).toHaveLength(2);
  });

  it("drops the source's own headline line", () => {
    const { blocks } = blocksFromPlan({ headline: "Lab Manual", insertions: [] }, paras, LAB);
    expect(blocks.filter((x) => x.html === "Lab Manual")).toHaveLength(1);
  });

  it("still weaves AI insertions and replaceTo around the paragraphs", () => {
    const plain = ["Title", "One.", "Two.", "Three."];
    const { blocks, counts } = blocksFromPlan({ headline: "Title", insertions: [{ after: 1, replaceTo: 2, type: "bullets", items: ["a", "b"] }, { after: 3, type: "h2", text: "End" }] }, plain, NEWS);
    expect(types(blocks)).toEqual(["h1", "standfirst", "byline", "dropcap", "bullets", "body", "h2"]);
    expect(counts.h2).toBe(1);
  });

  it("drops insertions the template doesn't allow", () => {
    const { blocks } = blocksFromPlan({ insertions: [{ after: 0, type: "code", text: "SELECT 1;" }] }, ["Title", "Body."], NEWS);
    expect(types(blocks)).not.toContain("code");
  });

  it("fills pictures and counts them", () => {
    const { blocks, counts } = blocksFromPlan({ insertions: [] }, ["Title", "[[image 0]]", "Figure 1: A"], LAB, { images: ["data:x"] });
    expect(blocks.find((x) => x.type === "image").slots).toEqual(["data:x"]);
    expect(counts.img).toBe(1);
  });
});

describe("mergeProse", () => {
  it("reads edited paragraphs back, keeping ids and adding new ones", () => {
    const doc = [b("body", { id: "p1", html: "One" }), b("body", { id: "p2", html: "Two" })];
    const node = document.createElement("div");
    node.innerHTML = "<p>One!</p><p>Two</p><p>Three</p><p>&nbsp;</p>";
    const next = mergeProse(doc, ["p1", "p2"], node);
    expect(next.map((x) => x.html)).toEqual(["One!", "Two", "Three"]);
    expect(next.slice(0, 2).map((x) => x.id)).toEqual(["p1", "p2"]);
  });

  it("returns null when nothing changed", () => {
    const doc = [b("body", { id: "p1", html: "One" })];
    const node = document.createElement("div");
    node.innerHTML = "<p>One</p>";
    expect(mergeProse(doc, ["p1"], node)).toBeNull();
  });
});

describe("misc", () => {
  it("parses JSON replies wrapped in fences or prose", () => {
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonReply('Sure! {"a":2} Done.')).toEqual({ a: 2 });
    expect(parseJsonReply('Here is the plan:\n```json\n{"a":3}\n```\nHope that helps.')).toEqual({ a: 3 });
  });

  it("tolerates trailing commas", () => {
    expect(parseJsonReply('{"insertions":[{"after":1,"type":"h2","text":"A"},],}')).toEqual({ insertions: [{ after: 1, type: "h2", text: "A" }] });
  });

  it("keeps the complete part of a plan cut off at the token limit", () => {
    const cut = '{"headline":"H","insertions":[{"after":1,"type":"h2","text":"A"},{"after":3,"type":"table","rows":[["x","y"],["1","2"]]},{"after":5,"type":"quote","text":"half a sente';
    const plan = parseJsonReply(cut);
    expect(plan.headline).toBe("H");
    expect(plan.insertions.map((o) => o.type)).toEqual(["h2", "table"]);
    expect(plan.insertions[1].rows).toEqual([["x", "y"], ["1", "2"]]);
  });

  it("isn't fooled by brackets and quotes inside strings", () => {
    const cut = '{"insertions":[{"after":1,"type":"h2","text":"a } ] \\" b"},{"after":2';
    expect(parseJsonReply(cut).insertions).toEqual([{ after: 1, type: "h2", text: 'a } ] " b' }]);
  });

  it("throws for replies with no JSON at all", () => {
    expect(() => parseJsonReply("")).toThrow(SyntaxError);
    expect(() => parseJsonReply("Sorry, I can't help with that.")).toThrow(SyntaxError);
    expect(() => parseJsonReply('{"a":')).toThrow(SyntaxError);
  });

  it("counts words without HTML", () => {
    expect(countWords([{ html: "<b>Two</b> words" }, { a: "three more words" }])).toBe(5);
  });

  it("builds every template's starter page with unique ids", () => {
    TEMPLATE_KEYS.forEach((key) => {
      const blocks = createStarterBlocks(key);
      expect(blocks.length).toBeGreaterThan(3);
      expect(new Set(blocks.map((x) => x.id)).size).toBe(blocks.length);
      blocks.forEach((x) => expect(TEMPLATES[key].blocks.concat(["h1", "standfirst", "dropcap", "byline"])).toContain(x.type));
    });
  });
});

describe("cloneBlock", () => {
  it("copies nested arrays and objects so patches never reach the original", () => {
    const original = { id: "x", type: "table", cells: [["a", "b"]], frames: [{ x: 1 }] };
    const copy = cloneBlock(original);
    copy.cells[0][0] = "z";
    copy.frames[0].x = 9;
    expect(original.cells[0][0]).toBe("a");
    expect(original.frames[0].x).toBe(1);
    expect(copy).not.toBe(original);
  });
});

describe("headerBlocks", () => {
  it("fills the byline with defaults when no author or desk is given", () => {
    const { h1, standfirst, byline } = headerBlocks("Title", "Sub");
    expect([h1.type, h1.html, standfirst.type, standfirst.html]).toEqual(["h1", "Title", "standfirst", "Sub"]);
    expect(byline.type).toBe("byline");
    expect(byline.a).toBeTruthy();
    expect(byline.b).toBe("Nutshell Today");
    expect(new Set([h1.id, standfirst.id, byline.id]).size).toBe(3);
  });
});
