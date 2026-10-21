import { guessLang } from "./highlight.js";

async function inflate(bytes, raw) {
  const ds = new DecompressionStream(raw ? "deflate-raw" : "deflate");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function latin1(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return s;
}

// .docx is a zip; pull word/document.xml straight out of it.
export async function readDocx(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a valid .docx file");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  let entry = null;
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const cmtLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = latin1(buf.subarray(p + 46, p + 46 + nameLen));
    if (name === "word/document.xml") { entry = { method, compSize, local }; break; }
    p += 46 + nameLen + extraLen + cmtLen;
  }
  if (!entry) throw new Error("No document found inside the .docx");

  const lNameLen = dv.getUint16(entry.local + 26, true);
  const lExtraLen = dv.getUint16(entry.local + 28, true);
  const start = entry.local + 30 + lNameLen + lExtraLen;
  const raw = buf.subarray(start, start + entry.compSize);
  const bytes = entry.method === 8 ? await inflate(raw, true) : raw;
  const xml = new TextDecoder("utf-8").decode(bytes);

  const paras = [];
  const re = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = re.exec(xml))) {
    const body = m[1].replace(/<w:tab\b[^>]*\/>/g, " ").replace(/<w:br\b[^>]*\/>/g, " ");
    let t = "";
    const tr = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tm;
    while ((tm = tr.exec(body))) t += tm[1];
    t = t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\s+/g, " ").trim();
    if (t) paras.push(t);
  }
  if (!paras.length) throw new Error("That .docx had no readable text");
  return paras.join("\n\n");
}

// pdf.js is fetched on the first PDF import only. It follows the page tree, so pages
// come out in order; maps glyphs through each font's encoding (ligatures, CID fonts);
// and never treats image or font data as text. The legacy build carries polyfills for
// the newer JS it relies on (Map#getOrInsert, Math.sumPrecise…), which Safari lacks.
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

// page.getTextContent() reads its stream with `for await`, which Safari can't do on a
// ReadableStream ("undefined is not a function"), so read the chunks by hand.
async function textItems(page) {
  const reader = page.streamTextContent().getReader();
  const items = [];
  const styles = {};
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return { items, styles };
    items.push(...value.items);
    Object.assign(styles, value.styles);
  }
}

// Typewriter fonts are code; bold fonts mark lead-ins ("Step 3:"). Names as embedded, e.g. "ABCDEF+CMTT10".
const MONO_FONT = /TT\d|Mono|Typewriter|Courier|Consol|Menlo|Inconsolata/i;
const BOLD_FONT = /Bold|Black|Heavy|Semibold|Demi|CMBX|BX\d/i;

function fontKind(page, styles, fontName) {
  let name = "";
  try {
    const font = page.commonObjs.get(fontName);
    name = (font && font.name) || "";
  } catch { /* font not loaded: fall back to the text layer's family */ }
  const family = (styles[fontName] && styles[fontName].fontFamily) || "";
  return { mono: MONO_FONT.test(name) || family === "monospace", bold: BOLD_FONT.test(name) };
}

// One page's text items grouped into lines: start x, baseline, font height and styled segments.
function pageLines(page, items, styles) {
  const kinds = {};
  const lines = [];
  let line = null;
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const kind = kinds[item.fontName] || (kinds[item.fontName] = fontKind(page, styles, item.fontName));
    const h = Math.abs(item.transform[3]) || item.height || 0;
    if (item.str.trim()) {
      if (!line) line = { x: item.transform[4], y: item.transform[5], h, segs: [] };
      line.h = Math.max(line.h, h);
    }
    if (line) line.segs.push({ str: item.str, x: item.transform[4], w: item.width || 0, h, ...kind });
    if (item.hasEOL && line) { lines.push(line); line = null; }
  }
  if (line) lines.push(line);
  return lines.map((l) => ({ ...l, text: l.segs.map((g) => g.str).join("").replace(/\s+/g, " ").trim() }));
}

// The commonest size of body text (weighted by characters), which headings are measured against.
function bodySize(pages) {
  const count = new Map();
  pages.forEach((lines) => lines.forEach((l) => l.segs.forEach((g) => {
    if (g.mono || !g.str.trim()) return;
    const k = Math.round(g.h * 2) / 2;
    count.set(k, (count.get(k) || 0) + g.str.length);
  })));
  let best = 10;
  let most = 0;
  count.forEach((n, k) => { if (n > most) { most = n; best = k; } });
  return best;
}

// Lines on most pages (running heads, page footers) differ only in their page number. Only a
// page's first and last lines are candidates, so repeated lines of code survive.
const repeatKey = (text) => text.replace(/\d+/g, "#");
const EDGE_LINES = 2;
const FOLIO = /^([ivxlc]+|\d+)$/i;

function dropRunningLines(pages) {
  const edge = (lines, i) => i < EDGE_LINES || i >= lines.length - EDGE_LINES;
  const seen = new Map();
  for (const lines of pages) {
    for (const key of new Set(lines.filter((l, i) => edge(lines, i)).map((l) => repeatKey(l.text)))) seen.set(key, (seen.get(key) || 0) + 1);
  }
  const limit = Math.ceil(pages.length * 0.6);
  return pages.map((lines) => lines.filter((l, i) => !edge(lines, i) || !((pages.length >= 3 && seen.get(repeatKey(l.text)) >= limit) || (FOLIO.test(l.text) && (i === 0 || i === lines.length - 1)))));
}

// Bullets and "i." / "2." style list items; their wrapped lines hang indented.
const LIST_ITEM = /^([•▪◦‣]|\(?[ivx]{1,4}[.)]|\d{1,2}[.)])\s/;
const ENDS_SENTENCE = /[.:;!?”")\]]$/;

// Whether line `l` starts a new paragraph after `prev`.
function startsParagraph(prev, l) {
  const h = Math.max(prev.h, l.h);
  const drop = prev.y - l.y;
  if (Math.abs(prev.h - l.h) > h * 0.1) return true; // heading ↔ body, title ↔ byline
  if (LIST_ITEM.test(l.text)) return true;
  if (l.marked && l.marked.startsWith("**")) return true; // bold lead-in: "Step 4: …"
  // Jumped up to a new column or region: carry on only mid-sentence.
  if (drop < -h) return ENDS_SENTENCE.test(prev.text);
  if (drop > h * 1.7) return true; // blank space between blocks
  const indent = l.x - prev.x;
  if (LIST_ITEM.test(prev.text)) return false; // hanging indent under a list item
  return indent > h * 0.8 && indent < h * 6; // indented first line
}

// Lines inside a paragraph are joined, keeping a trailing hyphen attached ("drug-" + "resistant").
function pageText(lines) {
  let out = "";
  lines.forEach((l, i) => {
    const prev = lines[i - 1];
    if (prev) out += startsParagraph(prev, l) ? "\n\n" : /-$/.test(out) ? "" : " ";
    out += l.marked;
  });
  return out.replace(/\*\* \*\*/g, " ").replace(/` `/g, " ");
}

// A body line with its bold runs as **bold** and typewriter runs as `code` (links stay plain).
function markedText(line) {
  const runs = [];
  line.segs.forEach((g) => {
    const style = g.str.trim() ? (g.mono ? "mono" : g.bold ? "bold" : "") : null;
    const last = runs[runs.length - 1];
    if (last && (style === null || style === last.style)) last.text += g.str;
    else runs.push({ style: style || "", text: g.str });
  });
  return runs.map((r) => {
    const [, lead, core, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.text.replace(/\s+/g, " "));
    // Links and paths set in typewriter type stay plain text.
    if (!core || !r.style || (r.style === "mono" && /^(https?:|www\.)|^\S*\/\S*$/.test(core))) return r.text.replace(/\s+/g, " ");
    return lead + (r.style === "mono" ? "`" + core + "`" : "**" + core + "**") + tail;
  }).join("").trim();
}

// LaTeX listings print code in fixed columns: pdf.js puts stray spaces inside a run of glyphs, while
// real spaces show up as gaps between runs. Rebuild each line from its x positions.
function codeLines(lines) {
  const segs = lines.flatMap((l) => l.code);
  // The column pitch, from runs one space apart (glyphs may be narrower than their column).
  const pitches = lines.flatMap((l) => l.code.slice(1).map((g, k) => {
    const a = l.code[k];
    const solid = a.str.replace(/\s/g, "").length;
    return solid ? (g.x - a.x) / (solid + 1) : 0;
  })).filter((n) => n > 0).sort((a, b) => a - b);
  const widths = segs.filter((g) => !/\s/.test(g.str) && g.str.length >= 3).map((g) => g.w / g.str.length).sort((a, b) => a - b);
  const median = (xs) => xs[Math.floor(xs.length / 2)];
  const charW = pitches.length >= 3 ? median(pitches) : widths.length ? median(widths) : (lines[0].h || 10) * 0.6;
  const left = Math.min(...segs.map((g) => g.x));
  return lines.map((l) => {
    let out = "";
    l.code.forEach((g) => {
      let str = g.str;
      const solid = str.replace(/\s/g, "").length;
      if (solid && Math.abs(g.w / solid - charW) < Math.abs(g.w / str.length - charW)) str = str.replace(/\s/g, "");
      const col = Math.round((g.x - left) / charW);
      // Separate runs always have a gap between them.
      if (col > out.length) out += " ".repeat(col - out.length);
      else if (out && !/\s$/.test(out)) out += " ";
      out += str;
    });
    return out.replace(/␣/g, " ").replace(/[‘`]/g, "`").replace(/[’′]/g, "'").replace(/[“”]/g, '"').replace(/−/g, "-").replace(/\s+$/, "");
  });
}

const CHAPTER_LABEL = /^(Chapter|Appendix)\s+([A-Z]|\d+)$/i;
const CONTENTS_TITLE = /^(Table of )?Contents$|^List of (Figures|Tables|Listings)$/i;
const CONTENTS_ENTRY = /(\.\s*){2,}\s*\S+$|\s([ivxlc]+|\d+)$/i;
const CAPTION_LINE = /^(Figure|Fig\.|Table|Listing)\s+[A-Z\d]+(?:[.-]\d+)*\s*:/i;
const HEADING_RATIO = { chapter: 1.6, section: 1.3, subsection: 1.12 };

// One page as paragraphs, with structure marked the way paraBlocks reads it: "# Chapter 2: Title",
// "## " / "### " headings, ``` code fences, [[toc]] for a contents page and [[image N]] for pictures.
function structuredPage(lines, body, state, marks) {
  const pieces = [];
  const text = [];
  const flush = () => { if (text.length) { pieces.push(pageText(text)); text.length = 0; } };
  const para = (p) => { flush(); pieces.push(p); };

  // Contents pages are rebuilt from the headings, so their entries are dropped.
  if (state.contents) {
    const entries = lines.filter((l) => CONTENTS_ENTRY.test(l.text)).length;
    if (entries < lines.length * 0.5) state.contents = false;
  }

  // Tiny digits at the start of a code line are listing line numbers.
  lines.forEach((l) => {
    l.numbered = false;
    l.code = l.segs.filter((g) => {
      if (g.h < body * 0.7 && /^\d+$/.test(g.str.trim())) { l.numbered = true; return false; }
      return !!g.str.trim();
    });
    const solid = l.code;
    l.mono = solid.length > 0 && solid.every((g) => g.mono);
    l.strong = l.mono && (l.h <= body * 0.95 || l.numbered);
    l.blank = l.numbered && !solid.length;
  });

  const isCode = lines.map(() => false);
  for (let i = 0; i < lines.length;) {
    if (!lines[i].mono && !lines[i].blank) { i += 1; continue; }
    let j = i;
    while (j < lines.length && (lines[j].mono || lines[j].blank)) j += 1;
    const run = lines.slice(i, j);
    if (run.some((l) => l.strong) || run.filter((l) => l.mono).length >= 3) for (let k = i; k < j; k++) isCode[k] = true;
    i = j;
  }

  let heading = null;
  const closeHeading = () => {
    if (!heading) return;
    const t = heading.text.join(" ");
    if (heading.level === 1 && CONTENTS_TITLE.test(t)) {
      if (/contents/i.test(t) && !state.tocDone) { para("[[toc]]"); state.tocDone = true; }
      state.contents = true;
    } else if (heading.level === 1 && heading.label) para("# " + heading.label + ": " + t);
    else para("#".repeat(heading.level) + " " + t);
    heading = null;
  };

  let markAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Pictures go in where they sit on the page: before the first line below their top edge.
    while (markAt < marks.length && marks[markAt].top > l.y) { closeHeading(); para("[[image " + marks[markAt].index + "]]"); markAt += 1; }
    if (state.contents) continue;

    if (isCode[i]) {
      closeHeading();
      let j = i;
      while (j < lines.length && isCode[j]) j += 1;
      const run = lines.slice(i, j);
      while (run.length && run[run.length - 1].blank) run.pop();
      const code = codeLines(run.filter((r) => !r.blank).length ? run.map((r) => (r.blank ? { ...r, code: [] } : r)) : []);
      // Decorative symbol fonts can look like code; real code has letters or digits.
      if (code.length && (code.join("").match(/[A-Za-z0-9]/g) || []).length >= 3) para("```" + guessLang(code.join("\n")) + "\n" + code.join("\n") + "\n```");
      i = j - 1;
      continue;
    }

    const ratio = l.h / body;
    const level = ratio >= HEADING_RATIO.chapter ? 1 : ratio >= HEADING_RATIO.section ? 2 : ratio >= HEADING_RATIO.subsection ? 3 : 0;
    if (level) {
      if (level === 1 && CHAPTER_LABEL.test(l.text)) { closeHeading(); heading = { level: 1, label: l.text, text: [] }; continue; }
      // A heading that wraps continues on the next line at the same size.
      if (heading && heading.level === level && (heading.label ? !heading.text.length || Math.abs(heading.h - l.h) < 0.5 : Math.abs(heading.h - l.h) < 0.5)) {
        heading.text.push(l.text);
        heading.h = l.h;
        continue;
      }
      closeHeading();
      heading = { level, label: null, text: [l.text], h: l.h };
      continue;
    }
    closeHeading();
    if (state.contents) continue;
    if (CAPTION_LINE.test(l.text)) { para(markedText(l)); continue; }
    text.push({ ...l, marked: markedText(l) });
  }
  closeHeading();
  while (markAt < marks.length) { para("[[image " + marks[markAt].index + "]]"); markAt += 1; }
  flush();
  return pieces.filter(Boolean).join("\n\n");
}

function multiply(m, t) {
  return [
    m[0] * t[0] + m[2] * t[1], m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3], m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4], m[1] * t[4] + m[3] * t[5] + m[5],
  ];
}

const MIN_PICTURE = 36; // pt: smaller images are rules, bullets and icons

// Where each picture is drawn on the page (PDF points, y up), following the transform stack.
function pictureBoxes(ops, OPS) {
  const paint = [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintJpegXObject].filter((n) => n != null);
  const boxes = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  ops.fnArray.forEach((fn, i) => {
    const args = ops.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() || ctm;
    else if (fn === OPS.transform) ctm = multiply(ctm, args);
    else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); if (args && args[0]) ctm = multiply(ctm, args[0]); }
    else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || ctm;
    else if (paint.includes(fn)) {
      const xs = [ctm[4], ctm[0] + ctm[4], ctm[2] + ctm[4], ctm[0] + ctm[2] + ctm[4]];
      const ys = [ctm[5], ctm[1] + ctm[5], ctm[3] + ctm[5], ctm[1] + ctm[3] + ctm[5]];
      const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      if (box.x1 - box.x0 < MIN_PICTURE || box.y1 - box.y0 < MIN_PICTURE) return;
      // The same picture drawn twice (or a mask under it) counts once.
      if (boxes.some((b) => Math.abs(b.x0 - box.x0) < 2 && Math.abs(b.y1 - box.y1) < 2)) return;
      boxes.push(box);
    }
  });
  return boxes.sort((a, b) => b.y1 - a.y1);
}

const PICTURE_SCALE = 2;
const MAX_PICTURE_SIDE = 1000;
const PICTURE_QUALITY = 0.8;

// Render the page and cut each picture out as a JPEG (browser only).
async function cropPictures(page, boxes) {
  const viewport = page.getViewport({ scale: PICTURE_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return boxes.map((b) => {
    const [ax, ay, bx, by] = viewport.convertToViewportRectangle([b.x0, b.y0, b.x1, b.y1]);
    const left = Math.max(0, Math.floor(Math.min(ax, bx)));
    const top = Math.max(0, Math.floor(Math.min(ay, by)));
    const w = Math.min(canvas.width - left, Math.ceil(Math.abs(bx - ax)));
    const h = Math.min(canvas.height - top, Math.ceil(Math.abs(by - ay)));
    const k = Math.min(1, MAX_PICTURE_SIDE / Math.max(w, h));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(w * k));
    out.height = Math.max(1, Math.round(h * k));
    out.getContext("2d").drawImage(canvas, left, top, w, h, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", PICTURE_QUALITY);
  });
}

// A code fence that runs over a page break continues in the next page's fence.
function joinPages(all, page) {
  if (!all) return page;
  if (/\n```$/.test(all) && /^```[\w+-]*\n/.test(page)) return all.slice(0, -4) + "\n" + page.replace(/^```[\w+-]*\n/, "");
  const lastPara = all.slice(all.lastIndexOf("\n\n") + 2);
  // A sentence that runs over the page break stays one paragraph.
  const carry = !/^(#|```|\[\[)/.test(lastPara) && !ENDS_SENTENCE.test(all) && /^[a-z(]/.test(page);
  return all + (carry ? (/-$/.test(all) ? "" : " ") : "\n\n") + page;
}

// Text of a PDF given the bytes and a pdf.js module, with its structure marked (see structuredPage),
// and its pictures as data URLs (cut out only where there is a DOM). Split out from readPdf so it
// can run against pdf.js's Node build.
export async function pdfText(pdfjs, data, onProgress) {
  const task = pdfjs.getDocument({ data, isEvalSupported: false });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    task.destroy();
    if (e && e.name === "PasswordException") throw new Error("That PDF is password-protected — remove the password and try again.");
    throw new Error("Couldn’t read that PDF — the file may be damaged.");
  }
  try {
    const pages = [];
    const marks = [];
    const images = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      // The operator list loads the fonts (for their names) and says where pictures are drawn.
      const ops = await page.getOperatorList();
      const { items, styles } = await textItems(page);
      pages.push(pageLines(page, items, styles));
      const boxes = pictureBoxes(ops, pdfjs.OPS);
      let crops = boxes.map(() => "");
      if (boxes.length && typeof document !== "undefined") {
        try { crops = await cropPictures(page, boxes); } catch { /* keep empty slots */ }
      }
      marks.push(boxes.map((b, k) => { images.push(crops[k]); return { top: b.y1, index: images.length - 1 }; }));
      page.cleanup();
      if (onProgress) onProgress(n, doc.numPages);
    }
    const body = bodySize(pages);
    const state = { contents: false, tocDone: false };
    const text = dropRunningLines(pages)
      .map((lines, i) => structuredPage(lines, body, state, marks[i]))
      .filter(Boolean)
      .reduce(joinPages, "");
    return { text, images };
  } finally {
    task.destroy();
  }
}

export async function readPdf(file, onProgress) {
  const pdfjs = await loadPdfJs();
  const { text, images } = await pdfText(pdfjs, new Uint8Array(await file.arrayBuffer()), onProgress);
  const clean = text.trim();
  // A short PDF is not a scanned one. Only fall back to AI when there is
  // essentially no text layer at all (a scan often yields a stray page number).
  if (clean.replace(/\[\[image \d+\]\]/g, "").replace(/[\s\d.,\-]/g, "").length < 24) {
    const err = new Error("No text layer in that PDF");
    err.noTextLayer = true;
    throw err;
  }
  return { text: clean, images };
}

export function pickFile(accept, onPick) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (f) onPick(f);
  };
  input.click();
}

export function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const MAX_IMAGE_SIDE = 2000;
const JPEG_QUALITY = 0.86;
// Chrome refuses CSS url() values over ~2 MB, and localStorage holds ~5 MB in total, so photos are
// stored resized. PNGs stay PNG (keeping transparency) while they are small enough.
const MAX_PNG_CHARS = 900000;
const MAX_URL_CHARS = 1200000;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable image")); };
    img.src = url;
  });
}

// An uploaded photo as a data URL small enough to display and autosave. Rejects for formats the
// browser can't decode (e.g. HEIC in Chrome).
export async function prepareImage(file) {
  const img = await loadImage(file);
  let side = Math.min(MAX_IMAGE_SIDE, Math.max(img.naturalWidth, img.naturalHeight));
  let quality = JPEG_QUALITY;
  // Re-encode smaller until well under the ~2 MB url() limit (only very detailed photos need this).
  for (let attempt = 0; ; attempt++) {
    const url = encodeImage(img, file.type, side, quality);
    if (url.length <= MAX_URL_CHARS || attempt >= 4) return url;
    side = Math.round(side * 0.8);
    quality = Math.max(0.6, quality - 0.08);
  }
}

function encodeImage(img, type, side, quality) {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (type === "image/png") {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    if (png.length <= MAX_PNG_CHARS) return png;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  // JPEG has no transparency: paint it white first.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
