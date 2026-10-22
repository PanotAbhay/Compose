import indexCss from "../index.css?raw";
import pageCss from "./exportPage.css?raw";
import { IMAGE_TYPES } from "../data/index.js";
import { cleanArticle } from "./exportHtml.js";
import { escapeHtml } from "./blocks.js";
import { toDataUrl } from "./fileReaders.js";

// Builds a complete, self-contained HTML page from the live article: colour and
// type tokens and embedded fonts, so it opens offline.

const FONT_URLS = Object.fromEntries(
  Object.entries(import.meta.glob("../assets/fonts/*.woff2", { query: "?url", import: "default", eager: true }))
    .map(([path, url]) => [path.split("/").pop(), url]),
);
// Latin subsets only: the article fonts in the scripts English text uses.
const KEEP_FONT = /^(?:(?:baskervville(?:-italic)?|roboto-mono)-latin(?:-ext)?|satoshi-\d+)\.woff2$/;

const SOURCE_CSS = indexCss.replace(/\/\*[\s\S]*?\*\//g, "");
const TOKENS_CSS = (SOURCE_CSS.match(/:root\s*\{[^}]*\}/g) || []).join("\n");
// Paragraph spacing and drop caps live in index.css because the editor's own paragraphs need them too.
const PROSE_CSS = (SOURCE_CSS.match(/[^{}]*\[data-(?:prose|lede)[^{}]*\{[^}]*\}/g) || []).map((r) => r.trim()).join("\n");

function prop(block, name) {
  const m = block.match(new RegExp(name + "\\s*:\\s*([^;}]+)"));
  return m ? m[1].trim() : "";
}

async function embed(url) {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error("couldn't load " + url.split("/").pop());
  return toDataUrl(await res.blob());
}

// Variable fonts repeat one file per weight; embed each file once and give its
// face the whole weight range instead.
async function embedFaces(blocks, urlOf) {
  const faces = new Map();
  for (const block of blocks) {
    const url = urlOf(block);
    if (!url) continue;
    const family = prop(block, "font-family").replace(/["']/g, "");
    const style = prop(block, "font-style") || "normal";
    const weight = parseInt(prop(block, "font-weight"), 10) || 400;
    const key = family + "|" + style + "|" + url;
    const face = faces.get(key) || { family, style, url, range: prop(block, "unicode-range"), min: weight, max: weight };
    face.min = Math.min(face.min, weight);
    face.max = Math.max(face.max, weight);
    faces.set(key, face);
  }
  const rules = await Promise.all(Array.from(faces.values()).map(async (f) => {
    const weight = f.min === f.max ? f.min : f.min + " " + f.max;
    return "@font-face{font-family:'" + f.family + "';font-style:" + f.style + ";font-weight:" + weight
      + ";font-display:swap;src:url(" + (await embed(f.url)) + ") format('woff2');"
      + (f.range ? "unicode-range:" + f.range + ";" : "") + "}";
  }));
  return rules.join("\n");
}

function bundledFontCss() {
  return embedFaces(SOURCE_CSS.match(/@font-face\s*\{[^}]*\}/g) || [], (block) => {
    const file = (block.match(/url\(\s*["']?[^"')]*?([^/"')]+\.woff2)/) || [])[1];
    return file && KEEP_FONT.test(file) ? FONT_URLS[file] : "";
  });
}

// Google's stylesheet labels each face with its subset in a comment.
async function googleFontCss(href) {
  const res = await fetch(href);
  if (!res.ok) throw new Error("couldn't load " + href);
  const blocks = Array.from((await res.text()).matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g))
    .filter((m) => m[1] === "latin" || m[1] === "latin-ext")
    .map((m) => m[2]);
  return embedFaces(blocks, (block) => (block.match(/url\(\s*["']?([^"')]+)/) || [])[1]);
}

// Built once per session; a failed build is retried on the next export.
const fontCache = new Map();
function cached(key, build) {
  if (!fontCache.has(key)) fontCache.set(key, build().catch((err) => { fontCache.delete(key); throw err; }));
  return fontCache.get(key);
}

// Bundled fonts must embed. Google fonts picked in Settings embed too when they
// can be fetched; otherwise the page links them and falls back to the stack offline.
async function fontCss(fontLinks) {
  const [bundled, google] = await Promise.all([
    cached("bundled", bundledFontCss),
    Promise.all(fontLinks.map((href) => cached(href, () => googleFontCss(href)).catch(() => null))),
  ]);
  return {
    css: [bundled, ...google.filter(Boolean)].join("\n"),
    links: fontLinks.filter((_, i) => !google[i]),
  };
}

// House tokens plus the tab's template colours and fonts (set on its canvas), as the
// article sees them, for rules that read them by variable (page colours, the drop cap).
function tokensCss(node) {
  const names = new Set(Array.from(TOKENS_CSS.matchAll(/(--[\w-]+)\s*:/g), (m) => m[1]));
  const canvas = node.closest(".canvas");
  if (canvas) Array.from(canvas.style).filter((n) => n.startsWith("--")).forEach((n) => names.add(n));
  const computed = getComputedStyle(node);
  const decls = Array.from(names).map((n) => [n, computed.getPropertyValue(n).trim()])
    .filter(([, v]) => v).map(([n, v]) => n + ":" + v + ";");
  return ":root{" + decls.join("") + "}";
}

// Print layouts: the A4 sheets as laid out, one per printed page.
const PRINT_CSS = "body{background:#E7E4DE;} [data-pages]{padding:32px 0;} @page{size:A4;margin:0;}"
  + " @media print{body{background:none;} [data-pages]{padding:0;} [data-page]{box-shadow:none!important;margin:0!important;}}";

// Photos are CSS backgrounds while editing; the page gets real <img>s.
// Empty slots go, and so does a figure left with none.
function photosToImages(article) {
  const selector = IMAGE_TYPES.map((t) => '[data-type="' + t + '"]').join(",");
  for (const wrap of article.querySelectorAll(selector)) {
    const grid = wrap.querySelector("figure > div");
    if (!grid) continue;
    for (const slot of Array.from(grid.children)) {
      const m = !slot.hasAttribute("data-empty") && (slot.getAttribute("style") || "").match(/url\(\s*(["']?)(.*?)\1\s*\)/);
      if (!m) { slot.remove(); continue; }
      const img = document.createElement("img");
      img.setAttribute("src", m[2]);
      img.setAttribute("alt", "");
      img.setAttribute("style", "width:100%;height:" + (slot.style.height || "auto") + ";object-fit:cover;background:var(--placeholder);");
      slot.replaceWith(img);
    }
    const n = grid.children.length;
    if (n) grid.style.gridTemplateColumns = "repeat(" + n + ",1fr)";
    else wrap.remove();
  }
}

function exportArticle(node, print) {
  const src = cleanArticle(node);
  const article = document.createElement(print ? "div" : "article");
  if (print) article.setAttribute("data-pages", "");
  article.append(...Array.from(src.childNodes));
  for (const wrap of article.querySelectorAll("[data-type]")) {
    const prose = wrap.querySelector(":scope > [data-prose]");
    if (prose) prose.removeAttribute("data-ids");
  }
  photosToImages(article);
  return article.outerHTML;
}

export function documentTitle(title) {
  return String(title || "").replace(/\s+/g, " ").trim() || "Article";
}

// `fontLinks` are the Google Fonts stylesheets the chosen typography uses.
export async function buildDocument({ node, title, fontLinks = [] }) {
  // Snapshot the article before waiting on fonts, so it matches the moment of the click.
  const print = node.getAttribute("data-layout") !== "web";
  const article = exportArticle(node, print);
  const tokens = tokensCss(node);
  const fonts = await fontCss(fontLinks);
  return "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
    + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
    + "<title>" + escapeHtml(documentTitle(title)) + "</title>\n"
    + fonts.links.map((href) => "<link rel=\"stylesheet\" href=\"" + escapeHtml(href) + "\">\n").join("")
    + "<style>\n" + fonts.css + "\n" + tokens + "\n" + PROSE_CSS + "\n" + pageCss + (print ? "\n" + PRINT_CSS : "") + "\n</style>\n"
    + "</head>\n<body>\n" + article + "\n</body>\n</html>\n";
}
