import { useEffect, useRef, useState } from "react";
import { articleHtml } from "../utils/exportHtml.js";
import { buildDocument, documentTitle } from "../utils/exportDocument.js";
import { fontLinks } from "../utils/fonts.js";
import { downloadBlob } from "../utils/dom.js";

function articleNode() {
  return document.querySelector("[data-article]");
}

// Safe as a file name on every OS: no separators, reserved characters or trailing dots.
function fileName(title) {
  return documentTitle(title).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "").replace(/[. ]+$/, "").slice(0, 120) || "Article";
}

export function useExport({ docTitle, fonts, flash }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const busyRef = useRef(false);
  const copiedTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  function copyHtml() {
    const node = articleNode();
    if (!node) return;
    const html = articleHtml(node, fontLinks(fonts));
    function done() {
      setExported(true);
      flash("COPIED THE ARTICLE HTML");
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setExported(false), 1600);
    }
    function failed() {
      flash("COULDN’T COPY — THE BROWSER BLOCKED THE CLIPBOARD. USE DOWNLOAD HTML INSTEAD", true);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(html).then(done, failed);
    else failed();
  }

  async function downloadHtml() {
    const node = articleNode();
    if (!node || busyRef.current) return;
    busyRef.current = true;
    setExporting(true);
    try {
      const html = await buildDocument({ node, title: docTitle, fontLinks: fontLinks(fonts) });
      const name = fileName(docTitle) + ".html";
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), name);
      flash("DOWNLOADED " + name.toUpperCase());
    } catch (err) {
      flash("HTML EXPORT FAILED — " + String((err && err.message) || err).toUpperCase(), true);
    } finally {
      busyRef.current = false;
      setExporting(false);
    }
  }

  return { downloadHtml, copyHtml, exporting, exported };
}
