import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TEMPLATES } from "../data/index.js";
import { useImport } from "./useImport.js";

const UNDO = { label: "UNDO", run: () => {} };

function setup(templateKey = "lab", aiReply = null) {
  const save = vi.fn();
  const flash = vi.fn();
  const setBusy = vi.fn();
  const undoOffer = vi.fn(() => UNDO);
  const aiConfig = { provider: "builtin", model: "test" };
  if (aiReply != null) window.claude = { complete: vi.fn().mockResolvedValue(aiReply) };
  const hook = renderHook(() => useImport({ busy: false, setBusy, save, flash, undoOffer, aiConfig, template: TEMPLATES[templateKey] }));
  return { hook, save, flash, setBusy };
}

const MANUAL = [
  "# Database Lab Manual",
  "[[toc]]",
  "# Chapter 1: Introduction",
  "## 1.1 Tools",
  "These are the tools.",
  "• MySQL",
  "• Oracle",
  "Listing 1.1: setup",
  "```sql",
  "CREATE TABLE emp (id INT);",
  "",
  "SELECT * FROM emp;",
  "```",
  "# Appendix A: Scripts",
].join("\n\n").replace("```sql\n\nCREATE", "```sql\nCREATE").replace(";\n\n\n\nSELECT", ";\n\nSELECT").replace("emp;\n\n```", "emp;\n```");

async function importAiWith(reply) {
  const s = setup("lab", reply);
  act(() => s.hook.result.current.setRaw(MANUAL));
  await act(async () => { await s.hook.result.current.importAi(); });
  return s;
}

describe("useImport", () => {
  afterEach(() => {
    delete window.claude;
    vi.restoreAllMocks();
  });

  it("imports marked text as plain text into Lab manual blocks", () => {
    const { hook, save } = setup("lab");
    act(() => hook.result.current.setRaw(MANUAL));
    act(() => hook.result.current.importPlain());
    const blocks = save.mock.calls[0][0];
    expect(blocks.map((b) => b.type)).toEqual(["h1", "standfirst", "byline", "toc", "chapter", "h2", "body", "bullets", "code", "appendix"]);
    expect(blocks[0].html).toBe("Database Lab Manual");
    expect(blocks.find((b) => b.type === "code")).toMatchObject({ a: "setup", text: "CREATE TABLE emp (id INT);\n\nSELECT * FROM emp;" });
  });

  it("imports the same text into the news template with its own blocks", () => {
    const { hook, save } = setup("news");
    act(() => hook.result.current.setRaw(MANUAL));
    act(() => hook.result.current.importPlain());
    const types = save.mock.calls[0][0].map((b) => b.type);
    expect(types).not.toContain("chapter");
    expect(types).not.toContain("code");
    expect(types).not.toContain("toc");
    expect(types).toContain("h2");
  });

  it("refuses to import less than two paragraphs, and says which problem it is", () => {
    const { hook, save } = setup("lab");
    act(() => hook.result.current.setRaw("Only a title"));
    act(() => hook.result.current.importPlain());
    expect(save).not.toHaveBeenCalled();
    expect(hook.result.current.importNote).toMatch(/AT LEAST TWO PARAGRAPHS/);
    expect(hook.result.current.importErr).toBe(true);

    act(() => hook.result.current.setRaw("   "));
    act(() => hook.result.current.importPlain());
    expect(hook.result.current.importNote).toMatch(/PASTE AN ARTICLE FIRST/);
  });

  it("offers UNDO after an import replaces the page", () => {
    const { hook, save, flash } = setup("news");
    act(() => hook.result.current.setRaw(MANUAL));
    act(() => hook.result.current.importPlain());
    expect(save).toHaveBeenCalled();
    expect(flash).toHaveBeenCalledWith(expect.stringMatching(/^IMPORTED/), false, UNDO);
  });

  it("drops the AI's reply when the import is cancelled", async () => {
    let answer;
    window.claude = { complete: vi.fn(() => new Promise((resolve) => { answer = resolve; })) };
    const { hook, save, flash, setBusy } = setup("lab");
    act(() => hook.result.current.openImport());
    act(() => hook.result.current.setRaw(MANUAL));
    let running;
    act(() => { running = hook.result.current.importAi(); });
    act(() => hook.result.current.closeImport());
    expect(hook.result.current.importOpen).toBe(false);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(flash).toHaveBeenCalledWith(expect.stringMatching(/IMPORT CANCELLED/));

    await act(async () => {
      answer(JSON.stringify({ headline: "Late", insertions: [] }));
      await running;
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("sends code to the AI as a summary and still imports it verbatim", async () => {
    const reply = JSON.stringify({ headline: "Database Lab Manual", standfirst: "", author: "QMUL", insertions: [{ after: 4, type: "nutshell", title: "Safety", items: ["Back up first."] }] });
    const { save } = await importAiWith(reply);
    const [{ messages, max_tokens }] = window.claude.complete.mock.calls[0];
    expect(max_tokens).toBe(16000);
    expect(messages[0].content).toContain("```sql (3 lines of code)```");
    expect(messages[0].content).not.toContain("CREATE TABLE");
    const blocks = save.mock.calls[0][0];
    expect(blocks.find((b) => b.type === "code").text).toContain("CREATE TABLE emp");
    expect(blocks.map((b) => b.type)).toContain("nutshell");
  });

  it("explains a reply that isn't a plan, and logs it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { hook, save } = await importAiWith("Sorry, I can't format that.");
    expect(save).not.toHaveBeenCalled();
    expect(hook.result.current.importNote).toMatch(/WASN’T A LAYOUT PLAN/);
    expect(error.mock.calls.some((c) => String(c[1]).includes("Sorry"))).toBe(true);
  });

  it("explains an empty reply", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { hook, save } = await importAiWith("");
    expect(save).not.toHaveBeenCalled();
    expect(hook.result.current.importNote).toMatch(/SENT BACK NOTHING/);
  });

  it("builds the page from a plan cut off part-way", async () => {
    const { save } = await importAiWith('{"headline":"Database Lab Manual","insertions":[{"after":4,"type":"nutshell","title":"Safety","items":["Back up first."]},{"after":6,"type":"h2","text":"Cut of');
    const types = save.mock.calls[0][0].map((b) => b.type);
    expect(types).toContain("nutshell");
    expect(types).toContain("chapter");
  });
});
