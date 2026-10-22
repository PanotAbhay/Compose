import { useState, useEffect, useRef } from "react";
import { STORAGE_KEYS, TEMPLATES, LAYOUT_KEYS } from "../data/index.js";
import { presetSettings } from "../data/fontSystems.js";
import { readStorage, readJson, writeStorage } from "../utils/storage.js";
import { createStarterBlocks, nid } from "../utils/blocks.js";
import { validFonts } from "../utils/fonts.js";

function uniqueTitle(docs, label) {
  const taken = new Set(docs.map((d) => d.title));
  if (!taken.has(label)) return label;
  let n = 2;
  while (taken.has(label + " " + n)) n += 1;
  return label + " " + n;
}

// A document's template is fixed when it is created; its fonts start from that template.
function makeDoc(templateKey, docs, extra = {}) {
  const template = TEMPLATES[templateKey];
  return {
    id: nid("d"),
    title: uniqueTitle(docs, template.label),
    templateKey,
    blocks: createStarterBlocks(templateKey),
    fonts: presetSettings(template.fontPreset),
    layout: "web",
    ...extra,
  };
}

function sanitize(doc) {
  const templateKey = TEMPLATES[doc.templateKey] ? doc.templateKey : "news";
  return {
    ...doc,
    templateKey,
    blocks: Array.isArray(doc.blocks) ? doc.blocks : [],
    fonts: validFonts(doc.fonts) ? doc.fonts : presetSettings(TEMPLATES[templateKey].fontPreset),
    layout: LAYOUT_KEYS.includes(doc.layout) ? doc.layout : "web",
  };
}

function loadWorkspace() {
  const saved = readJson(STORAGE_KEYS.workspace);
  if (saved && Array.isArray(saved.docs)) {
    const docs = saved.docs.map(sanitize);
    const activeId = docs.some((d) => d.id === saved.activeId) ? saved.activeId : docs[0]?.id ?? null;
    return { docs, activeId };
  }

  // Migrate the single-document version: its page becomes the first tab.
  const blocks = readJson(STORAGE_KEYS.doc);
  if (Array.isArray(blocks) && blocks.length) {
    const savedTemplate = readStorage(STORAGE_KEYS.template);
    const templateKey = TEMPLATES[savedTemplate] ? savedTemplate : "news";
    const doc = makeDoc(templateKey, [], { title: "Feature Story", blocks });
    return { docs: [doc], activeId: doc.id };
  }
  return { docs: [], activeId: null };
}

// Storage full: keep every tab's text, drop photos too large to autosave.
function lightCopy(workspace) {
  let dropped = 0;
  const docs = workspace.docs.map((d) => ({
    ...d,
    blocks: d.blocks.map((b) => {
      if (!b.slots) return b;
      const slots = b.slots.map((s) => {
        if (s && s.length > 4000) { dropped += 1; return ""; }
        return s;
      });
      return { ...b, slots };
    }),
  }));
  return { light: { ...workspace, docs }, dropped };
}

export function useWorkspace(flash) {
  const [workspace, setWorkspace] = useState(loadWorkspace);
  // "saved", "partial" (text saved, photos dropped) or "failed": what the save indicator shows.
  const [saveState, setSaveState] = useState("saved");
  const photoWarnRef = useRef(false);
  const failWarnRef = useRef(false);

  useEffect(() => {
    if (writeStorage(STORAGE_KEYS.workspace, JSON.stringify(workspace))) {
      photoWarnRef.current = false;
      failWarnRef.current = false;
      setSaveState("saved");
      return;
    }
    const { light, dropped } = lightCopy(workspace);
    if (!writeStorage(STORAGE_KEYS.workspace, JSON.stringify(light))) {
      setSaveState("failed");
      // Warn once; the save indicator keeps showing it, instead of a flash on every keystroke.
      if (!failWarnRef.current) {
        failWarnRef.current = true;
        flash("AUTOSAVE FAILED — BROWSER STORAGE IS FULL. DOWNLOAD YOUR HTML BEFORE RELOADING", true);
      }
      return;
    }
    failWarnRef.current = false;
    setSaveState(dropped ? "partial" : "saved");
    if (dropped && !photoWarnRef.current) {
      photoWarnRef.current = true;
      flash(dropped + " PHOTO" + (dropped > 1 ? "S" : "") + " TOO LARGE TO AUTOSAVE — RE-ADD AFTER RELOAD", true);
    }
  }, [workspace]);

  function createDoc(templateKey) {
    setWorkspace((ws) => {
      const created = makeDoc(templateKey, ws.docs);
      return { docs: [...ws.docs, created], activeId: created.id };
    });
  }

  // `patch` is an object or a function of the current document.
  function updateDoc(id, patch) {
    setWorkspace((ws) => ({
      ...ws,
      docs: ws.docs.map((d) => (d.id === id ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d)),
    }));
  }

  function closeDoc(id) {
    setWorkspace((ws) => {
      const at = ws.docs.findIndex((d) => d.id === id);
      const docs = ws.docs.filter((d) => d.id !== id);
      const activeId = ws.activeId !== id ? ws.activeId : (docs[Math.min(at, docs.length - 1)]?.id ?? null);
      return { docs, activeId };
    });
  }

  // Undo for closing a tab: put the document back where it was and make it active.
  function reopenDoc(doc, index) {
    setWorkspace((ws) => {
      if (ws.docs.some((d) => d.id === doc.id)) return ws;
      const docs = ws.docs.slice();
      docs.splice(Math.max(0, Math.min(docs.length, index)), 0, doc);
      return { docs, activeId: doc.id };
    });
  }

  return {
    docs: workspace.docs,
    active: workspace.docs.find((d) => d.id === workspace.activeId) || null,
    saveState,
    selectDoc: (id) => setWorkspace((ws) => ({ ...ws, activeId: id })),
    createDoc,
    updateDoc,
    closeDoc,
    reopenDoc,
  };
}
