import { useState, useEffect, useRef } from "react";
import { STORAGE_KEYS, TEMPLATES } from "../data/index.js";
import { readStorage, writeStorage } from "../utils/storage.js";
import { nid, plainParas, blocksFromPlan, paraBlocks, splitHeadline, promptPara } from "../utils/blocks.js";
import { readDocx, readPdf, pickFile } from "../utils/fileReaders.js";
import { callAiJson, aiErrorMessage, transcribePdf } from "../utils/ai.js";
import { importPrompt } from "../utils/prompts.js";

const DOC_ACCEPT = ".txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMPORT_TIMEOUT = 300000;
// The plan for a long document (a 50-page manual) lists hundreds of insertions.
const IMPORT_MAX_TOKENS = 16000;

function importErrorMessage(e, aiConfig) {
  const m = String((e && e.message) || e);
  if (/TIMED_OUT/.test(m)) return "THE MODEL DIDN’T ANSWER IN 5 MINUTES — TRY A SHORTER ARTICLE OR A FASTER MODEL.";
  if (e instanceof SyntaxError) return "THE MODEL’S REPLY WASN’T A LAYOUT PLAN — TRY AGAIN, OR USE PLAIN TEXT ONLY.";
  return aiErrorMessage(e, aiConfig) || "COULDN’T FORMAT — TRY AGAIN.";
}

export function useImport({ busy, setBusy, save, flash, undoOffer, aiConfig, template }) {
  const [recovered, setRecovered] = useState(() =>
    // Any article text imported previously stays available to re-import.
    readStorage(STORAGE_KEYS.recovered) || readStorage(STORAGE_KEYS.legacyRecovered) || ""
  );
  const [raw, setRaw] = useState(recovered);
  const [importOpen, setImportOpen] = useState(false);
  const [importNote, setImportNote] = useState("");
  const [importErr, setImportErr] = useState(false);
  const [fileNote, setFileNote] = useState("");
  const [fileErr, setFileErr] = useState(false);
  const [reading, setReading] = useState(false);
  // Pictures cut out of an imported PDF, for its [[image N]] markers. Not autosaved with the text.
  const [images, setImages] = useState([]);
  const timerRef = useRef(null);
  // The AI import in flight; cancelling clears it, so a late reply is dropped.
  const runRef = useRef(null);
  const numbered = !!template.theme.numbering;

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (runRef.current) runRef.current.abort();
  }, []);

  function note(msg, err) {
    setImportNote(msg);
    setImportErr(!!err);
  }

  function openImport() {
    setImportOpen(true);
    note("");
    setFileNote("");
    setFileErr(false);
  }

  function undoAction() {
    return undoOffer ? undoOffer() : undefined;
  }

  function keepSource(text) {
    if (!text || text.length < 200) return;
    if (writeStorage(STORAGE_KEYS.recovered, text)) setRecovered(text);
  }

  function failEmpty() {
    note(raw.trim() ? "NEED AT LEAST TWO PARAGRAPHS — SEPARATE THEM WITH A BLANK LINE." : "PASTE AN ARTICLE FIRST.", true);
  }

  async function loadDocFile(file) {
    const name = String(file.name || "");
    setFileNote("Reading " + name + "…");
    setFileErr(false);
    setReading(true);
    note("");
    try {
      let text = "";
      let pictures = [];
      if (/\.docx$/i.test(name)) text = await readDocx(file);
      else if (/\.pdf$/i.test(name)) {
        try {
          ({ text, images: pictures } = await readPdf(file, (done, total) => setFileNote("Reading " + name + " — page " + done + " of " + total + "…")));
        } catch (e) {
          if (!e || !e.noTextLayer) throw e;
          setFileNote("No text layer in " + name + " — reading the pages with AI, this can take a minute…");
          text = await transcribePdf(aiConfig, file);
        }
      }
      else if (/\.doc$/i.test(name)) throw new Error("Old .doc files aren’t supported — save as .docx first.");
      else text = await file.text();

      text = text.replace(/\r\n?/g, "\n").trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      if (!words) throw new Error("That file had no readable text");
      keepSource(text);
      setRaw(text);
      setImages(pictures);
      const found = pictures.filter(Boolean).length;
      setFileNote(name + " — " + words.toLocaleString() + " words" + (found ? ", " + found + " pictures" : "") + " loaded");
    } catch (e) {
      setFileNote(aiErrorMessage(e, aiConfig) || String((e && e.message) || e));
      setFileErr(true);
    } finally {
      setReading(false);
    }
  }

  function restoreRecovered() {
    setRaw(recovered);
    setImages([]);
    setFileNote("Last imported article restored — press Format with AI to rebuild it.");
  }

  function importPlain() {
    if (busy || reading) return;
    keepSource(raw);
    const paras = plainParas(raw);
    if (paras.length < 2) { failEmpty(); return; }
    const { headline, rest: body } = splitHeadline(paras);
    // A leading "By …" line is the byline, not the opening paragraph.
    let author = "Staff Correspondent";
    const first = body.length ? String(body[0]).trim() : "";
    if (/^by\s+\S/i.test(first) && first.length < 80) {
      author = first.replace(/^by\s+/i, "").trim();
      body.shift();
    }
    const blocks = paraBlocks(body, { allowed: template.blocks, numbered, images, lists: true }).filter(Boolean);
    const lede = blocks.find((b) => b.type === "body");
    if (lede && template.blocks.includes("dropcap")) lede.type = "dropcap";
    save([
      { id: nid(), type: "h1", html: headline },
      { id: nid(), type: "standfirst", html: "" },
      { id: nid(), type: "byline", a: author, b: "Nutshell Today" },
      ...blocks,
    ]);
    setImportOpen(false);
    note("");
    flash("IMPORTED " + paras.length + " PARAGRAPHS", false, undoAction());
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function importAi() {
    if (busy || reading) return;
    keepSource(raw);
    const paras = plainParas(raw);
    if (paras.length < 2) { failEmpty(); return; }
    setBusy(true);
    note("READING " + paras.length + " PARAGRAPHS…");

    // A long article can take a minute; show it is still working.
    const t0 = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      const stage = s < 12 ? "READING " + paras.length + " PARAGRAPHS" : (s < 30 ? "PLANNING THE LAYOUT" : "BUILDING THE ELEMENTS");
      note(stage + "… " + s + "S");
    }, 1000);

    const run = new AbortController();
    runRef.current = run;
    let timeoutId = null;
    try {
      const call = callAiJson(aiConfig, importPrompt(template), paras.map((p, i) => "[" + i + "] " + promptPara(p)).join("\n\n"), IMPORT_MAX_TOKENS, { signal: run.signal });
      const timeout = new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error("TIMED_OUT")), IMPORT_TIMEOUT); });
      const plan = await Promise.race([call, timeout]);
      if (runRef.current !== run) return;
      const typeOrder = (template.starter || []).map((b) => b.type);
      const { blocks, counts } = blocksFromPlan(plan, paras, template.blocks, { numbered, images, typeOrder });
      // The template stays fixed; a different suggestion is only mentioned.
      const suggested = TEMPLATES[plan.suggestedTemplate];
      const hint = suggested && suggested.key !== template.key ? " · READS LIKE " + suggested.label.toUpperCase() + " — TRY IT IN A NEW TAB" : "";

      stopTimer();
      save(blocks);
      setBusy(false);
      setImportOpen(false);
      note("");
      flash("FORMATTED · " + counts.h2 + " SUB-HEADS · " + counts.data + " DATA ELEMENTS · " + counts.img + " IMAGES" + hint, false, undoAction());
    } catch (e) {
      if (runRef.current !== run) return;
      stopTimer();
      console.error("[Compose] import failed", e);
      setBusy(false);
      note(importErrorMessage(e, aiConfig), true);
    } finally {
      clearTimeout(timeoutId);
      if (runRef.current === run) runRef.current = null;
    }
  }

  // Cancel, Escape and closing the modal all stop a running import; its reply is then ignored.
  function closeImport() {
    const run = runRef.current;
    setImportOpen(false);
    if (!run) return;
    runRef.current = null;
    run.abort();
    stopTimer();
    setBusy(false);
    note("");
    flash("IMPORT CANCELLED — THE PAGE WASN’T CHANGED");
  }

  return {
    importOpen,
    openImport,
    closeImport,
    raw,
    setRaw,
    importNote,
    importErr,
    fileNote,
    fileErr,
    reading,
    recovered,
    pickDocFile: () => pickFile(DOC_ACCEPT, loadDocFile),
    restoreRecovered,
    importPlain,
    importAi,
  };
}
