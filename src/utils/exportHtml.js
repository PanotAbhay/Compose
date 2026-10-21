import { escapeHtml } from "./blocks.js";

// Swap var() references for their current values, so the pasted article keeps the tab's
// typography and its template's colours without the app's stylesheet.
function bakeVars(css, computed) {
  let out = "";
  let i = 0;
  for (;;) {
    const at = css.indexOf("var(", i);
    if (at < 0) return out + css.slice(i);
    let end = at + 3;
    for (let depth = 0; end < css.length; end++) {
      if (css[end] === "(") depth++;
      else if (css[end] === ")" && --depth === 0) break;
    }
    const inner = css.slice(at + 4, end);
    const name = inner.split(",")[0].trim();
    const value = name.startsWith("--") ? computed.getPropertyValue(name).trim() : "";
    out += css.slice(i, at) + (value || css.slice(at, end + 1));
    i = end + 1;
  }
}

// Clone the live article and strip everything that only exists for editing.
export function cleanArticle(node) {
  const c = node.cloneNode(true);
  // Read the variables where they are set: font settings and template colours live on the tab's canvas.
  const computed = getComputedStyle(node);
  c.querySelectorAll("[style]").forEach((n) => n.setAttribute("style", bakeVars(n.getAttribute("style"), computed)));
  c.querySelectorAll("[data-chrome]").forEach((n) => n.remove());
  c.querySelectorAll("[contenteditable]").forEach((n) => {
    n.removeAttribute("contenteditable");
    n.removeAttribute("data-ph");
  });
  c.querySelectorAll("select,button").forEach((n) => n.remove());
  const last = c.lastElementChild;
  if (last && /drag elements here/i.test(last.textContent)) last.remove();
  c.querySelectorAll("[data-rw]").forEach((n) => n.removeAttribute("data-rw"));
  // The indent rule lives in index.css, so bake it onto each paragraph.
  c.querySelectorAll("[data-indent] > p").forEach((p) => {
    const indented = p.previousElementSibling || p.parentElement.hasAttribute("data-continued");
    p.setAttribute("style", "margin:0;text-indent:" + (indented ? "1.5em" : "0") + ";");
  });
  c.querySelectorAll(".nt-blk").forEach((n) => {
    n.removeAttribute("class");
    n.removeAttribute("data-sel");
    n.removeAttribute("data-blk");
    // Keep two-column behaviour: spanning heads and figures that must not split.
    const keep = ["columnSpan", "breakInside", "breakAfter", "overflow", "height"]
      .filter((k) => n.style[k])
      .map((k) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()) + ":" + n.style[k] + ";")
      .join("");
    n.setAttribute("style", "position:relative;" + keep);
  });
  // Print layouts export the A4 pages as laid out; the last page needs no page break after it.
  const pages = c.querySelectorAll("[data-page]");
  if (pages.length) pages[pages.length - 1].style.breakAfter = "auto";
  return c;
}

// `fontLinks` are stylesheet URLs for web fonts the article uses.
export function articleHtml(node, fontLinks = []) {
  const c = cleanArticle(node);
  const computed = getComputedStyle(node);
  const links = fontLinks.map((href) => '<link rel="stylesheet" href="' + href + '">').join("");
  // Paragraph spacing and drop caps come from index.css; carry them with the tab's own fonts.
  const dropFont = computed.getPropertyValue("--h1-font").trim() || "serif";
  const ink = computed.getPropertyValue("--ink").trim() || "#1E1E1E";
  const proseCss = "<style>[data-prose]>p{margin:0 0 18px;}[data-prose]>p:last-child{margin-bottom:0;}"
    + "[data-lede=\"1\"]>p:first-child::first-letter{float:left;font-family:" + dropFont
    + ";font-size:76px;line-height:0.72;font-weight:600;color:" + ink + ";margin:6px 12px 0 0;}</style>";

  if (node.getAttribute("data-layout") !== "web") return links + proseCss + '<div data-pages="">' + c.innerHTML + "</div>";
  return links + proseCss + '<article style="max-width:688px;margin:0 auto;">' + c.innerHTML + "</article>";
}

// @font-face rules from the app's stylesheets, with font URLs made absolute so they load
// in a new window.
function fontFaceCss() {
  let css = "";
  Array.from(document.styleSheets).forEach((sheet) => {
    let rules;
    try { rules = sheet.cssRules; } catch { return; }
    const base = sheet.href || location.href;
    Array.from(rules).forEach((r) => {
      if (r.type !== CSSRule.FONT_FACE_RULE) return;
      css += r.cssText.replace(/url\(["']?([^"')]+)["']?\)/g, (_, u) => 'url("' + new URL(u, base).href + '")') + "\n";
    });
  });
  return css;
}

// A standalone page for Preview: the exported article with the app's fonts. Print layouts show
// the A4 sheets and print one sheet per page.
export function previewDocument(html, { title, print, autoPrint = false }) {
  const pageCss = print
    ? "body{background:#E7E4DE;padding:32px 0;} @page{size:A4;margin:0;} @media print{html,body{background:none;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} [data-page]{box-shadow:none!important;margin:0!important;}}"
    : "body{background:#FFFFFF;padding:48px 16px;}";
  // Export PDF: open the print dialog once fonts are ready, so "Save as PDF" gets the real typefaces.
  const printScript = autoPrint ? "<script>document.fonts.ready.then(function(){setTimeout(function(){window.print();},250);});</script>" : "";
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>" + escapeHtml(title) + "</title>"
    + "<style>" + fontFaceCss() + "*,*::before,*::after{box-sizing:border-box;} body{margin:0;-webkit-font-smoothing:antialiased;} img{display:block;} " + pageCss + "</style>"
    + "</head><body>" + html + printScript + "</body></html>";
}
