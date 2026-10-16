import { useEffect, useRef, useState } from "react";
import { TEMPLATES, LAYOUTS } from "../../../data/index.js";
import { bindContent, pressable } from "../../../utils/dom.js";
import "./TopBar.css";

const EXPORT_ITEMS = [
  { id: "html", icon: "download", label: "Download HTML" },
  { id: "copy", icon: "content_copy", label: "Copy HTML" },
  { id: "pdf", icon: "picture_as_pdf", label: "Export PDF" },
];

const SAVE_LABELS = {
  saved: "All changes saved",
  partial: "Saved without photos",
  failed: "Not saved — storage full",
};

const SAVE_HINTS = {
  saved: "Saved in this browser as you work",
  partial: "Browser storage is full: the text is saved, but photos too large to keep will be gone after a reload",
  failed: "Browser storage is full and nothing is being saved. Download the HTML from the Export menu before you reload",
};

function ExportMenu({ exported, exporting, onDownloadHtml, onCopy, onPdf }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key !== "Escape") return;
      setOpen(false);
      if (triggerRef.current) triggerRef.current.focus();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Keyboard users land on the first item, as in a native menu.
    const first = ref.current && ref.current.querySelector('[role="menuitem"]');
    if (first) first.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleMenuKey(e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(ref.current.querySelectorAll('[role="menuitem"]'));
    const at = items.indexOf(document.activeElement);
    const next = (at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }

  const actions = { html: onDownloadHtml, copy: onCopy, pdf: onPdf };
  const label = exporting ? "Preparing…" : exported ? "Copied" : "Export";
  const hint = onPdf ? "Download, copy or print the article" : "Download or copy the article · Export PDF needs an A4 layout";

  return (
    <div className="top-bar-export" ref={ref}>
      <button
        ref={triggerRef}
        className="top-bar-btn"
        title={hint}
        disabled={exporting}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="ms top-bar-icon" aria-hidden="true">ios_share</span>{label}
        <span className="ms top-bar-caret" aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div className="top-bar-menu" role="menu" aria-label="Export" onKeyDown={handleMenuKey}>
          {EXPORT_ITEMS.filter((item) => actions[item.id]).map((item) => (
            <button
              key={item.id}
              className="top-bar-menu-item"
              role="menuitem"
              onClick={() => { setOpen(false); actions[item.id](); }}
            >
              <span className="ms top-bar-icon" aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar({
  docTitle, onDocTitle, templateKey, layout, onLayout, note, noteErr, noteAction, onNoteAction, saveState = "saved", busy,
  zoom, defaultZoom = 0.75, onZoomIn, onZoomOut, onZoomReset, exported, exporting, onExport, onDownloadHtml, onExportPdf, onPreview, onExportTex, onImport,
}) {
  const unsaved = saveState !== "saved";
  const zoomPct = Math.round(zoom * 100);

  // Enter keeps the new name, Escape puts the old one back; both leave the field.
  function handleTitleKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.currentTarget.innerText = docTitle;
      e.currentTarget.blur();
    }
  }

  return (
    <div className="top-bar">
      <div className="top-bar-brand">
        <span className="top-bar-logo">COMPOSE</span>
      </div>
      <div className="top-bar-doc">
        <span
          ref={(node) => bindContent(node, docTitle)}
          className="top-bar-title"
          contentEditable
          role="textbox"
          aria-label="Document title"
          spellCheck={false}
          onKeyDown={handleTitleKey}
          onBlur={(e) => onDocTitle(e.target.innerText)}
        />
        <span className="ms top-bar-title-caret" aria-hidden="true">expand_more</span>
        <span className="top-bar-status">Draft</span>
        {templateKey && (
          <span className="top-bar-template" title="This document's template is fixed. Open a new tab to use a different one.">
            <span className="ms top-bar-template-icon" aria-hidden="true">{TEMPLATES[templateKey].icon}</span>
            <span className="top-bar-template-label">{TEMPLATES[templateKey].label}</span>
            <span className="ms top-bar-template-lock" aria-hidden="true">lock</span>
          </span>
        )}
        {onLayout && (
          <div className="top-bar-columns" role="group" aria-label="Page layout" title="Page layout for this document">
            {LAYOUTS.map((l) => (
              <button
                key={l.key}
                className={`top-bar-columns-btn${layout === l.key ? " top-bar-columns-btn--on" : ""}`}
                title={l.hint}
                aria-pressed={layout === l.key}
                onClick={() => onLayout(l.key)}
              >
                <span className="ms top-bar-columns-icon" aria-hidden="true">{l.icon}</span>
                <span className="top-bar-columns-label">{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="top-bar-actions">
        <span className="sr-only" role="status">{note}</span>
        {note && (
          <span className="top-bar-note" style={{ color: noteErr ? "#E8836F" : "rgba(242,239,233,0.55)" }}>
            {note}
            {noteAction && <button className="top-bar-note-action" onClick={onNoteAction}>{noteAction.label}</button>}
          </span>
        )}
        <div className={`top-bar-saved${unsaved && !busy ? " top-bar-saved--warn" : ""}`} title={busy ? undefined : SAVE_HINTS[saveState]}>
          <span className="ms top-bar-saved-icon" aria-hidden="true">{unsaved && !busy ? "error" : "check"}</span>
          <span className="top-bar-saved-label">{busy ? "Working…" : SAVE_LABELS[saveState]}</span>
        </div>
        <div className="top-bar-zoom" role="group" aria-label="Zoom">
          <div
            className="top-bar-zoom-btn"
            title="Zoom out"
            aria-label="Zoom out"
            aria-disabled={zoomPct <= 50}
            onClick={onZoomOut}
            {...pressable(onZoomOut)}
          >
            <span className="ms top-bar-icon" aria-hidden="true">remove</span>
          </div>
          <span
            className="top-bar-zoom-pct"
            title={"Reset zoom to " + Math.round(defaultZoom * 100) + "%"}
            aria-label={"Zoom " + zoomPct + "%. Reset to " + Math.round(defaultZoom * 100) + "%"}
            onClick={onZoomReset}
            {...(onZoomReset ? pressable(onZoomReset) : {})}
          >
            {zoomPct + "%"}
          </span>
          <div
            className="top-bar-zoom-btn"
            title="Zoom in"
            aria-label="Zoom in"
            aria-disabled={zoomPct >= 150}
            onClick={onZoomIn}
            {...pressable(onZoomIn)}
          >
            <span className="ms top-bar-icon" aria-hidden="true">add</span>
          </div>
        </div>
        <div className="top-bar-divider"></div>
        {onExportTex && (
          <button className="top-bar-btn" title="Download a LaTeX file — a .zip with your photos when the article has any, ready for Overleaf" onClick={onExportTex}>
            <span className="ms top-bar-icon" aria-hidden="true">download</span>Export .tex
          </button>
        )}
        {onPreview && (
          <button className="top-bar-btn" title="Open the rendered document in a new browser tab" onClick={onPreview}>
            <span className="ms top-bar-icon" aria-hidden="true">visibility</span>Preview
          </button>
        )}
        <ExportMenu
          exported={exported}
          exporting={exporting}
          onDownloadHtml={onDownloadHtml}
          onCopy={onExport}
          onPdf={onExportPdf}
        />
        <button className="top-bar-btn top-bar-btn--gold" title="Import a .docx, PDF or pasted text and format it with AI" onClick={onImport}>
          <span className="ms top-bar-icon" aria-hidden="true">auto_awesome</span>Import
        </button>
      </div>
    </div>
  );
}
