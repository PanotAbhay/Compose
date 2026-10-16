import { useEffect, useRef, useState } from "react";
import { articleHtml } from "../utils/exportHtml.js";
import { buildDocument, documentTitle } from "../utils/exportDocument.js";
import { fontLinks } from "../utils/fonts.js";

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

  async function run(work, failMsg) {
    const node = articleNode();
    if (!node || busyRef.current) return;
    busyRef.current = true;
    setExporting(true);
    try {
      await work(node);
    } catch (err) {
      flash(failMsg + " — " + String((err && err.message) || err).toUpperCase(), true);
    } finally {
      busyRef.current = false;
      setExporting(false);
    }
  }

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

  function downloadHtml() {
    return run(async (node) => {
      const html = await buildDocument({ node, title: docTitle, fontLinks: fontLinks(fonts) });
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(docTitle) + ".html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash("DOWNLOADED " + a.download.toUpperCase());
    }, "HTML EXPORT FAILED");
  }

  return { downloadHtml, copyHtml, exporting, exported };
}
