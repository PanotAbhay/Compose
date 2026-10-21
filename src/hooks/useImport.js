import { useState, useEffect, useRef } from "react";
import { STORAGE_KEYS, TEMPLATES } from "../data/index.js";
import { readStorage, writeStorage } from "../utils/storage.js";
import { headerBlocks, plainParas, blocksFromPlan, paraBlocks, splitHeadline, promptPara } from "../utils/blocks.js";
import { readDocx, readPdf, pickFile } from "../utils/fileReaders.js";
import { callAiJson, aiErrorMessage, transcribePdf } from "../utils/ai.js";
import { importPrompt } from "../utils/prompts.js";

const DOC_ACCEPT = ".txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMPORT_TIMEOUT = 300000;
// The plan for a long document (a 50-page manual) lists hundreds of insertions.
const IMPORT_MAX_TOKENS = 16000;

function importErrorMessage(e) {
  const m = String((e && e.message) || e);
  if (/TIMED_OUT/.test(m)) return "THE MODEL DIDN’T ANSWER IN 5 MINUTES — TRY A SHORTER ARTICLE OR A FASTER MODEL.";
  if (e instanceof SyntaxError) return "THE MODEL’S REPLY WASN’T A LAYOUT PLAN — TRY AGAIN, OR USE PLAIN TEXT ONLY.";
  if (/rate|429/i.test(m)) return "RATE LIMITED — WAIT, THEN RETRY.";
  if (/failed to fetch|networkerror/i.test(m)) return "CAN’T REACH THE MODEL — CHECK KEY, MODEL NAME AND CONNECTION.";
  return aiErrorMessage(e) || "COULDN’T FORMAT — TRY AGAIN.";
}

export function useImport({ busy, setBusy, save, flash, setNoteErr, aiConfig, template }) {
  const [recovered, setRecovered] = useState(() =>
    // Any article text imported previously stays available to re-import.
    readStorage(STORAGE_KEYS.recovered) || readStorage(STORAGE_KEYS.legacyRecovered) || ""
  );
  const [raw, setRaw] = useState(recovered);
  const [importOpen, setImportOpen] = useState(false);
  const [importNote, setImportNote] = useState("");
  const [fileNote, setFileNote] = useState("");
  // Pictures cut out of an imported PDF, for its [[image N]] markers. Not autosaved with the text.
  const [images, setImages] = useState([]);
  const timerRef = useRef(null);
  const numbered = !!template.theme.numbering;

  useEffect(() => () => clearInterval(timerRef.current), []);

  function openImport() {
    setImportOpen(true);
    setImportNote("");
    setFileNote("");
  }

  function keepSource(text) {
    if (!text || text.length < 200) return;
    if (writeStorage(STORAGE_KEYS.recovered, text)) setRecovered(text);
  }

  function failEmpty() {
    setImportNote("PASTE AN ARTICLE FIRST.");
    setNoteErr(true);
  }

  async function loadDocFile(file) {
    const name = String(file.name || "");
    setFileNote("Reading " + name + "…");
    setImportNote("");
    setNoteErr(false);
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
      setFileNote(String((e && e.message) || e));
      setNoteErr(true);
    }
  }

  function restoreRecovered() {
    setRaw(recovered);
    setImages([]);
    setFileNote("Last imported article restored — press Format with AI to rebuild it.");
  }

  function importPlain() {
    keepSource(raw);
    const paras = plainParas(raw);
    if (paras.length < 2) { failEmpty(); return; }
    const { headline, rest: body } = splitHeadline(paras);
    // A leading "By …" line is the byline, not the opening paragraph.
    let author = "";
    const first = body.length ? String(body[0]).trim() : "";
    if (/^by\s+\S/i.test(first) && first.length < 80) {
      author = first.replace(/^by\s+/i, "").trim();
      body.shift();
    }
    const blocks = paraBlocks(body, { allowed: template.blocks, numbered, images, lists: true }).filter(Boolean);
    const lede = blocks.find((b) => b.type === "body");
    if (lede && template.blocks.includes("dropcap")) lede.type = "dropcap";
    save([...Object.values(headerBlocks(headline, "", author)), ...blocks]);
    setImportOpen(false);
    setImportNote("");
    flash("IMPORTED " + paras.length + " PARAGRAPHS");
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function importAi() {
    if (busy) return;
    keepSource(raw);
    const paras = plainParas(raw);
    if (paras.length < 2) { failEmpty(); return; }
    setBusy(true);
    setImportNote("READING " + paras.length + " PARAGRAPHS…");
    setNoteErr(false);

    // A long article can take a minute; show it is still working.
    const t0 = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      const stage = s < 12 ? "READING " + paras.length + " PARAGRAPHS" : (s < 30 ? "PLANNING THE LAYOUT" : "BUILDING THE ELEMENTS");
      setImportNote(stage + "… " + s + "S");
      setNoteErr(false);
    }, 1000);

    try {
      const call = callAiJson(aiConfig, importPrompt(template), paras.map((p, i) => "[" + i + "] " + promptPara(p)).join("\n\n"), IMPORT_MAX_TOKENS);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMED_OUT")), IMPORT_TIMEOUT));
      const plan = await Promise.race([call, timeout]);
      const typeOrder = (template.starter || []).map((b) => b.type);
      const { blocks, counts } = blocksFromPlan(plan, paras, template.blocks, { numbered, images, typeOrder });
      // The template stays fixed; a different suggestion is only mentioned.
      const suggested = TEMPLATES[plan.suggestedTemplate];
      const hint = suggested && suggested.key !== template.key ? " · READS LIKE " + suggested.label.toUpperCase() + " — TRY IT IN A NEW TAB" : "";

      stopTimer();
      save(blocks);
      setBusy(false);
      setImportOpen(false);
      setImportNote("");
      flash("FORMATTED · " + counts.h2 + " SUB-HEADS · " + counts.data + " DATA ELEMENTS · " + counts.img + " IMAGES" + hint);
    } catch (e) {
      stopTimer();
      console.error("[Compose] import failed", e);
      setBusy(false);
      setImportNote(importErrorMessage(e));
      setNoteErr(true);
    }
  }

  return {
    importOpen,
    openImport,
    closeImport: () => setImportOpen(false),
    raw,
    setRaw,
    importNote,
    fileNote,
    recovered,
    pickDocFile: () => pickFile(DOC_ACCEPT, loadDocFile),
    restoreRecovered,
    importPlain,
    importAi,
  };
}
