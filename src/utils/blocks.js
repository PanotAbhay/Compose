import { NEW_BLOCK, IMAGE_TYPES, HEADING_TYPES, CHAPTER_TYPES, TEMPLATES } from "../data/index.js";
import { guessLang } from "./highlight.js";

let uid = 0;

export function nid() {
  uid += 1;
  return "b" + Date.now().toString(36) + uid;
}

export function withId(block) {
  return { id: nid(), ...block };
}

export function cloneBlock(block) {
  return JSON.parse(JSON.stringify(block));
}

export function createStarterBlocks(templateKey = "news") {
  return TEMPLATES[templateKey].starter.map((b) => withId(cloneBlock(b)));
}

export function countWords(blocks) {
  return blocks.reduce((n, b) => {
    const t = [b.html, b.a, b.b].filter(Boolean).join(" ").replace(/<[^>]*>/g, " ");
    return n + t.split(/\s+/).filter(Boolean).length;
  }, 0);
}

// A sub-heading owns every block after it until the next heading; a chapter, until the next chapter.
export function sectionEnd(blocks, i) {
  const type = blocks[i].type;
  let stops;
  if (CHAPTER_TYPES.includes(type)) stops = ["h1", ...CHAPTER_TYPES];
  else if (HEADING_TYPES.includes(type)) stops = ["h1", "h2", "h3", ...CHAPTER_TYPES];
  else return i + 1;
  let j = i + 1;
  while (j < blocks.length && !stops.includes(blocks[j].type)) j += 1;
  return j;
}

export function moveBlock(blocks, id, index) {
  const cur = blocks.slice();
  const from = cur.findIndex((b) => b.id === id);
  if (from < 0) return null;
  const [item] = cur.splice(from, 1);
  let to = index;
  if (from < index) to -= 1;
  cur.splice(Math.max(0, Math.min(cur.length, to)), 0, item);
  return cur;
}

export function moveSection(blocks, id, index) {
  const cur = blocks.slice();
  const from = cur.findIndex((b) => b.id === id);
  if (from < 0) return null;
  const end = sectionEnd(cur, from);
  const count = end - from;
  if (index > from && index < end) return null;
  const items = cur.splice(from, count);
  let to = index;
  if (from < index) to -= count;
  to = Math.max(0, Math.min(cur.length, to));
  cur.splice(to, 0, ...items);
  return cur;
}

// Read a prose field back into one block per paragraph.
export function mergeProse(blocks, ids, node) {
  const ps = Array.from(node.children).filter((n) => n.tagName === "P");
  let htmls = ps.length ? ps.map((p) => p.innerHTML) : [node.innerHTML];
  htmls = htmls.filter((h) => String(h).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0);
  if (!htmls.length) htmls = [""];

  const cur = blocks.slice();
  const start = cur.findIndex((b) => b.id === ids[0]);
  if (start < 0) return null;

  const out = htmls.map((h, idx) => {
    const old = cur[start + idx];
    if (old && ids.includes(old.id)) return { ...old, html: h };
    return { id: nid(), type: "body", html: h };
  });
  if (JSON.stringify(cur.slice(start, start + ids.length)) === JSON.stringify(out)) return null;
  cur.splice(start, ids.length, ...out);
  return cur;
}

export function plainParas(text) {
  const raw = String(text == null ? "" : text).split("\n");
  const out = [];
  let hardBreak = true;
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i].trim();
    // A blank line is an explicit paragraph break — never swallow it.
    if (!t) { hardBreak = true; continue; }
    // A ``` fence is one paragraph, kept line for line with its indentation.
    if (t.startsWith("```")) {
      const code = [];
      let j = i + 1;
      while (j < raw.length && raw[j].trim() !== "```") { code.push(raw[j].replace(/\s+$/, "")); j += 1; }
      out.push(t + "\n" + code.join("\n") + "\n```");
      i = j;
      hardBreak = true;
      continue;
    }
    const prev = out.length && !/^(```|#|\[\[)/.test(out[out.length - 1]) ? out[out.length - 1] : null;
    // Only un-wrap lines that are genuinely a wrapped continuation: directly
    // below the previous line, which is long and lacks terminal punctuation.
    // Short unpunctuated lines are headings, bylines and table rows, not prose.
    const wrapped = prev && !hardBreak && prev.length > 60 &&
      !/[.!?:;…"”’)\]]$/.test(prev) && !/^[•\-–—*\d#[]/.test(t);
    if (wrapped) out[out.length - 1] = prev + " " + t;
    else out.push(t);
    hardBreak = false;
  }
  return out;
}

// A reply cut off mid-JSON (the model hit its token limit): keep everything up to the last
// complete object or array and close the brackets still open, so the plan so far survives.
function closeTruncated(s) {
  let open = "";
  let inString = false;
  let escaped = false;
  let cut = 0;
  let closers = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{" || c === "[") open = (c === "{" ? "}" : "]") + open;
    else if (c === "}" || c === "]") {
      open = open.slice(1);
      cut = i + 1;
      closers = open;
    }
  }
  return s.slice(0, cut) + closers;
}

// The JSON object in a model's reply, tolerating code fences, text around it, trailing commas
// and a reply cut off part-way.
export function parseJsonReply(reply) {
  const s = String(reply || "");
  const a = s.indexOf("{");
  if (a < 0) throw new SyntaxError("No JSON object in the reply");
  const from = s.slice(a);
  try {
    return JSON.parse(from.slice(0, from.lastIndexOf("}") + 1));
  } catch (e) {
    try { return JSON.parse(closeTruncated(from.replace(/,(\s*[}\]])/g, "$1"))); } catch { throw e; }
  }
}

function toBars(bars) {
  return bars.map((r) => ({ label: String(r.label).toUpperCase(), value: parseFloat(r.value) || 0 }));
}

function toListHtml(items) {
  return items.map((i) => "<li>" + String(i) + "</li>").join("");
}

function toTableRows(rows) {
  const out = rows.map((r) => (Array.isArray(r) ? r : [r]).map(String));
  const width = Math.max(0, ...out.map((r) => r.length));
  out.forEach((r) => { while (r.length < width) r.push(""); });
  return out;
}

// Turn one element from a model's JSON reply into a block (without an id).
export function elementToBlock(o, pollNote = "") {
  const t = String(o.type || "").toLowerCase();
  const hasBars = Array.isArray(o.bars) && o.bars.length;
  const hasRows = Array.isArray(o.rows) && o.rows.length;
  const hasItems = Array.isArray(o.items) && o.items.length;

  if ((HEADING_TYPES.includes(t) || CHAPTER_TYPES.includes(t)) && o.text) return { type: t, html: o.text };
  if (t === "code" && o.text) return { type: "code", lang: o.lang || guessLang(o.text), a: o.caption || "", text: String(o.text) };
  if (t === "toc") return NEW_BLOCK.toc();
  if (t === "quote" && o.text) {
    return { type: "quote", a: String(o.text).replace(/^["“]|["”]$/g, ""), b: o.cite ? "— " + String(o.cite).toUpperCase() : "" };
  }
  if (IMAGE_TYPES.includes(t)) {
    const blk = NEW_BLOCK[t]();
    blk.a = o.caption || blk.a;
    return blk;
  }
  if (t === "stats" && Array.isArray(o.cells) && o.cells.length) {
    return {
      type: "stats",
      a: o.title || "By the numbers",
      b: o.note || "",
      cells: o.cells.slice(0, 4).map((c) => ({ value: String(c.value), label: String(c.label).toUpperCase() })),
    };
  }
  if (t === "chart" && hasBars) return { type: "chart", a: o.title || "Chart", b: o.note || "", bars: toBars(o.bars) };
  if (t === "line" && hasBars) return { type: "line", a: o.title || "Trend", b: o.note || "", bars: toBars(o.bars) };
  if (t === "poll" && hasBars) return { type: "poll", a: o.title || "Poll", b: o.note || pollNote, bars: toBars(o.bars) };
  if (t === "timeline" && hasRows) {
    return {
      type: "timeline",
      rows: o.rows.map((r) => ({ d: String(r.d || r.date || ""), t: String(r.t || r.title || ""), x: String(r.x || r.text || "") })),
    };
  }
  if (t === "table" && hasRows) return { type: "table", a: o.title || "", rows: toTableRows(o.rows) };
  if (t === "nutshell" && hasItems) return { type: "nutshell", a: o.title || "The Nutshell", html: toListHtml(o.items) };
  if ((t === "bullets" || t === "numbered") && hasItems) return { type: t, html: toListHtml(o.items) };
  return null;
}

export function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CODE_STYLE = "font-family: var(--font-mono); font-size: 0.92em";

export function inlineCodeHtml(text) {
  return '<code style="' + CODE_STYLE + '">' + escapeHtml(text) + "</code>";
}

// Imported text marks **bold** and `code` (a PDF's bold and typewriter fonts); as editor HTML.
export function inlineHtml(text) {
  return escapeHtml(text)
    .replace(/`([^`\n]+)`/g, (_, c) => '<code style="' + CODE_STYLE + '">' + c + "</code>")
    .replace(/\*\*([^*\n]+?)\*\*/g, "<b>$1</b>");
}

// Paragraphs the PDF reader (or a writer) has already structured.
const FENCE = /^```([\w+-]*)\n([\s\S]*?)\n?```$/;
const IMAGE_MARK = /^\[\[image (\d+)\]\]$/;
const TOC_MARK = /^\[\[toc\]\]$/;
const CHAPTER_MARK = /^#\s+(Chapter|Appendix)\s+([A-Z]|\d+)\s*[:.–—-]?\s*(.*)$/i;
const HEADING_MARK = /^(#{1,3})\s+(.+)$/;
const FIGURE_CAPTION = /^(?:Figure|Fig\.)\s+[A-Z\d]+(?:[.-]\d+)*\s*[:.]\s*(.+)$/i;
const LISTING_CAPTION = /^Listing\s+[A-Z\d]+(?:[.-]\d+)*\s*[:.]\s*(.+)$/i;
// "2.1 ", "A.3 ", "4 " before a heading; dropped when the template numbers headings itself.
const SECTION_NUMBER = /^(?:\d{1,2}(?:\.\d+)*\.?|[A-Z](?:\.\d+)+\.?)\s+/;
const BULLET_ITEM = /^[•▪◦‣\-–*]\s+(.+)$/;
const NUMBER_ITEM = /^\d{1,2}[.)]\s+(.+)$/;

export function isMarked(para) {
  return FENCE.test(para) || IMAGE_MARK.test(para) || TOC_MARK.test(para) || HEADING_MARK.test(para);
}

// The paragraph as the AI sees it: code is summarised, so long listings neither cost tokens nor get rewritten.
export function promptPara(para) {
  const m = FENCE.exec(para);
  return m ? "```" + m[1] + " (" + m[2].split("\n").length + " lines of code)```" : para;
}

// Pick the document title out of the first paragraphs: the first "# " heading that isn't a chapter,
// else the first paragraph — unless that is structure (a chapter, code, a picture), which stays put.
export function splitHeadline(paras) {
  const k = paras.slice(0, 6).findIndex((p) => /^#\s/.test(p) && !CHAPTER_MARK.test(p));
  if (k < 0 && paras.length && isMarked(paras[0])) return { headline: "", rest: paras.slice() };
  const at = k < 0 ? 0 : k;
  return { headline: String(paras[at] || "").replace(/^#+\s+/, ""), rest: paras.filter((_, i) => i !== at) };
}

// One block per paragraph (null where a paragraph was absorbed, e.g. a caption), keeping only the
// types the template allows. `images` fills [[image N]] markers; `numbered` drops the source's own
// heading and figure numbers; `lists` gathers "•" and "1." paragraphs into lists.
export function paraBlocks(paras, { allowed, numbered = false, images = [], lists = false }) {
  const out = paras.map(() => null);
  let list = null;
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    let m;
    const item = lists ? BULLET_ITEM.exec(p) || NUMBER_ITEM.exec(p) : null;
    const listType = item && (BULLET_ITEM.test(p) ? "bullets" : "numbered");
    if (!item || !allowed.includes(listType) || !list || list.type !== listType) list = null;

    if ((m = FENCE.exec(p))) {
      const caption = i > 0 && out[i - 1] && out[i - 1].type === "body" ? LISTING_CAPTION.exec(paras[i - 1]) : null;
      if (caption && allowed.includes("code")) out[i - 1] = null;
      out[i] = allowed.includes("code")
        ? withId({ type: "code", lang: m[1] || guessLang(m[2]), a: caption ? caption[1] : "", text: m[2] })
        : withId({ type: "body", html: m[2].split("\n").map(inlineCodeHtml).join("<br>") });
    } else if ((m = IMAGE_MARK.exec(p))) {
      if (!allowed.includes("image")) continue;
      const next = paras[i + 1] || "";
      const caption = FIGURE_CAPTION.exec(next);
      out[i] = withId({ type: "image", slots: [images[Number(m[1])] || ""], a: caption ? (numbered ? caption[1] : next) : "", b: "" });
      if (caption) i += 1;
    } else if (TOC_MARK.test(p)) {
      if (allowed.includes("toc")) out[i] = withId(NEW_BLOCK.toc());
    } else if ((m = CHAPTER_MARK.exec(p))) {
      const type = /^a/i.test(m[1]) ? "appendix" : "chapter";
      const label = m[1] + " " + m[2];
      out[i] = withId(allowed.includes(type)
        ? { type, html: inlineHtml(m[3] || label) }
        : { type: "h2", html: inlineHtml(numbered || !m[3] ? m[3] || label : label + ": " + m[3]) });
    } else if ((m = HEADING_MARK.exec(p))) {
      const text = numbered ? m[2].replace(SECTION_NUMBER, "") : m[2];
      out[i] = withId({ type: m[1].length === 3 ? "h3" : "h2", html: inlineHtml(text) });
    } else if (item && allowed.includes(listType)) {
      if (list) out[list.at].html += "<li>" + inlineHtml(item[1]) + "</li>";
      else {
        out[i] = withId({ type: listType, html: "<li>" + inlineHtml(item[1]) + "</li>" });
        list = { type: listType, at: i };
      }
    } else {
      out[i] = withId({ type: "body", html: inlineHtml(p) });
    }
  }
  return out;
}

function normalize(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Stretches of the source inside quotation marks: "…", “…”, ‘…’ and '…'. A closing mark followed
// by a letter is an apostrophe (don’t), and so is a straight ' after a letter (Florida's).
const QUOTED = /["“][^"“”]+["”]|‘[^‘]+?’(?![a-z])|(?<![a-z])'[^']+?'(?![a-z])/gi;

// A pull quote must be words the source itself puts in quotation marks, never a paraphrase of
// reported speech. An ellipsis may join pieces of the same quotation.
export function quotedInSource(quote, source) {
  const plain = (s) => String(s || "").replace(/&[a-z]+;|&#\d+;/gi, " ");
  const parts = plain(quote).split(/…|\.\.\./).map(normalize).filter(Boolean);
  if (!parts.length) return false;
  const spans = (plain(source).match(QUOTED) || []).map(normalize);
  return spans.some((span) => parts.every((p) => span.includes(p)));
}

// Weave the model's plan of insertions around the untouched source paragraphs,
// keeping only the block types the chosen template allows. Paragraphs the PDF reader
// already structured (code, images, headings) convert directly; see paraBlocks.
// `typeOrder` is the template's starter page as block types; its header order wins.
export function blocksFromPlan(plan, paras, allowed, { numbered = false, images = [], typeOrder = [] } = {}) {
  const headline = plan.headline || paras[0];
  const author = plan.author || "Staff Correspondent";
  let standfirst = plan.standfirst || "";
  // A standfirst that just restates the headline is noise.
  if (normalize(standfirst) === normalize(headline)) standfirst = "";

  // Source lines already promoted into the header must not repeat as body copy.
  const skip = {};
  [headline, standfirst, author].forEach((v) => {
    const k = normalize(v);
    if (!k) return;
    skip[k] = true;
    skip["by" + k] = true;
    skip["byline" + k] = true;
  });

  // Header in the template's own order (LaTeX: title, author, then abstract, as \maketitle sets it).
  const header = {
    h1: { id: nid(), type: "h1", html: headline },
    standfirst: { id: nid(), type: "standfirst", html: standfirst },
    byline: { id: nid(), type: "byline", a: author, b: plan.desk || "Nutshell Today" },
  };
  const blocks = [...new Set([...typeOrder, "h1", "standfirst", "byline"])].filter((t) => header[t]).map((t) => header[t]);
  const ins = Array.isArray(plan.insertions) ? plan.insertions.slice() : [];
  ins.sort((x, y) => (x.after | 0) - (y.after | 0));

  const counts = { h2: 0, quote: 0, img: 0, data: 0 };
  const source = paras.join("\n");
  function emit(o) {
    if (String(o.type || "").toLowerCase() === "divider") {
      if (allowed.includes("divider")) blocks.push({ id: nid(), type: "divider" });
      return;
    }
    const blk = elementToBlock(o);
    if (!blk || !allowed.includes(blk.type)) return;
    if (blk.type === "quote" && !quotedInSource(blk.a, source)) return;
    blocks.push(withId(blk));
    if (blk.type === "h2") counts.h2++;
    else if (blk.type === "quote") counts.quote++;
    else if (IMAGE_TYPES.includes(blk.type)) counts.img++;
    else if (["stats", "chart", "line", "poll", "timeline", "table"].includes(blk.type)) counts.data++;
  }
  function emitAfter(i) {
    ins.filter((o) => (o.after | 0) === i).forEach(emit);
  }

  // Paragraphs an element stands in for must not also appear as body copy.
  const consumed = {};
  ins.forEach((o) => {
    const to = parseInt(o.replaceTo, 10);
    if (!isFinite(to)) return;
    for (let k = (o.after | 0) + 1; k <= to && k < paras.length; k++) consumed[k] = true;
  });

  ins.filter((o) => (o.after | 0) < 0).forEach(emit);
  const mapped = paraBlocks(paras, { allowed, numbered, images });
  let ledeDone = false;
  for (let i = 0; i < paras.length; i++) {
    const blk = mapped[i];
    if (consumed[i] || !blk) { emitAfter(i); continue; }
    const textual = ["body", "h2", "h3"].includes(blk.type);
    const k = textual ? normalize(paras[i]) : "";
    // Drop the source's own headline / byline / standfirst lines, and any
    // sub-heading the plan already lifted verbatim out of the body.
    // Repeated headings ("Exercises" in every chapter) are kept; repeated paragraphs are not.
    if (!textual) blocks.push(blk);
    else if (k && !skip[k]) {
      if (blk.type === "body") {
        skip[k] = true;
        blocks.push(!ledeDone && allowed.includes("dropcap") ? { ...blk, type: "dropcap" } : blk);
        ledeDone = true;
      } else {
        blocks.push(blk);
        if (blk.type === "h2") counts.h2++;
      }
    }
    if (IMAGE_TYPES.includes(blk.type)) counts.img++;
    emitAfter(i);
  }
  ins.filter((o) => (o.after | 0) >= paras.length).forEach(emit);

  return { blocks, counts };
}
