import { useState, useRef } from "react";
import { useFlash } from "../../hooks/useFlash.js";
import { useDocument } from "../../hooks/useDocument.js";
import { useZoom } from "../../hooks/useZoom.js";
import { useAiSettings } from "../../hooks/useAiSettings.js";
import { useWorkspace } from "../../hooks/useWorkspace.js";
import { useSelectionBar } from "../../hooks/useSelectionBar.js";
import { useShortcuts } from "../../hooks/useShortcuts.js";
import { useBlockDrag } from "../../hooks/useBlockDrag.js";
import { useImport } from "../../hooks/useImport.js";
import { useAiFill } from "../../hooks/useAiFill.js";
import { useExport } from "../../hooks/useExport.js";
import { useUnloadGuard } from "../../hooks/useUnloadGuard.js";
import { NEW_BLOCK, TEMPLATES, blockLabel } from "../../data/index.js";
import { createStarterBlocks, cloneBlock, nid, sectionEnd, mergeProse, countWords, nudgeBlock } from "../../utils/blocks.js";
import { articleHtml, previewDocument } from "../../utils/exportHtml.js";
import { blocksToLatex, texFileName } from "../../utils/latexExport.js";
import { makeZip } from "../../utils/zip.js";
import { framedImages } from "../../utils/imageCrop.js";
import { fontLinks, fontVars } from "../../utils/fonts.js";
import { presetSettings, presetById } from "../../data/fontSystems.js";
import { TopBar } from "./components/TopBar.jsx";
import { IconRail } from "./components/IconRail.jsx";
import { ElementsPanel } from "./components/ElementsPanel.jsx";
import { Canvas } from "./components/Canvas.jsx";
import { FormatToolbar } from "./components/FormatToolbar.jsx";
import { SettingsModal } from "./components/SettingsModal.jsx";
import { ImportModal } from "./components/ImportModal.jsx";
import { TemplatePicker } from "./components/TemplatePicker.jsx";
import { DocTabs } from "./components/DocTabs.jsx";
import { ShortcutsModal } from "./components/ShortcutsModal.jsx";
import "./ComposePage.css";

function plural(n, word) {
  return n + " " + word + (n === 1 ? "" : "S");
}

export function ComposePage() {
  const { note, noteErr, noteAction, flash, runAction } = useFlash();
  const workspace = useWorkspace(flash);
  const { active } = workspace;
  const doc = useDocument({ doc: active, updateDoc: workspace.updateDoc, flash });
  const { zoom, defaultZoom, zoomIn, zoomOut, zoomReset } = useZoom();
  const { aiConfig, saveAi } = useAiSettings();
  const [bar, setBar] = useSelectionBar();
  // Everything below follows the active tab; its template never changes.
  const template = TEMPLATES[active ? active.templateKey : "news"];

  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Where palette clicks insert; tracked without re-rendering on every caret move.
  const caretIdxRef = useRef(null);
  // The last tab closed, kept with its undo history so UNDO can bring it back.
  const closedRef = useRef(null);
  const texBusyRef = useRef(false);

  function insertBlock(index, block) {
    const id = doc.insertAt(index, block);
    drag.clearDrop();
    return id;
  }

  const filler = useAiFill({ getBlocks: doc.getBlocks, save: doc.save, flash, undoOffer, aiConfig, rules: template.aiRules });
  const drag = useBlockDrag({ getBlocks: doc.getBlocks, save: doc.save, insertBlock, onFill: filler.fillFromText, flash });
  const importer = useImport({ busy, setBusy, flash, undoOffer, aiConfig, save: doc.save, template });
  const exporter = useExport({ docTitle: active ? active.title : "", fonts: active ? active.fonts : null, flash });
  useUnloadGuard(workspace.saveState !== "saved" || busy || filler.building.length > 0);

  function handleUndo() {
    if (doc.undo()) setSel(null);
  }

  function handleRedo() {
    if (doc.redo()) setSel(null);
  }

  // An UNDO button for the change just made. It won't undo a later edit made in the meantime.
  function undoOffer() {
    const after = doc.getBlocks();
    return {
      label: "UNDO",
      run: () => {
        if (doc.getBlocks() === after) handleUndo();
        else flash("THE PAGE HAS CHANGED SINCE — USE CTRL+Z TO STEP BACK", true);
      },
    };
  }

  // Scroll a block just added into view and select it, so it's clear where it went.
  function reveal(id) {
    setTimeout(() => {
      const node = document.querySelector('[data-unit="' + id + '"]');
      if (!node) return;
      if (node.classList.contains("nt-blk")) setSel(id);
      if (node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
    }, 0);
  }

  useShortcuts({
    selected: sel,
    onEscape: () => { setSel(null); setBar(null); },
    onLeaveText: handleLeaveText,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onShortcuts: () => setShortcutsOpen(true),
    onSelectSibling: handleSelectSibling,
    onEditBlock: handleEditBlock,
    onMoveBlock: handleMoveBlock,
    onDuplicateBlock: () => handleDuplicate(sel),
    onDeleteBlock: handleDeleteSelected,
  });

  // Esc while typing in a block commits the text and selects the block, ready for block keys.
  function handleLeaveText(node) {
    const frame = node.closest(".nt-blk[data-unit]");
    node.blur();
    setBar(null);
    if (!frame) return;
    const id = frame.getAttribute("data-unit");
    handleSelect(id, doc.getBlocks().findIndex((b) => b.id === id));
  }

  // Blocks in reading order, as drawn (a block split across pages appears once).
  function framedIds() {
    const ids = Array.from(document.querySelectorAll(".canvas .nt-blk[data-unit]")).map((n) => n.getAttribute("data-unit"));
    return ids.filter((id, i) => ids.indexOf(id) === i);
  }

  function handleSelectSibling(dir) {
    const ids = framedIds();
    const next = ids[ids.indexOf(sel) + dir];
    if (!next) return;
    handleSelect(next, doc.getBlocks().findIndex((b) => b.id === next));
    const node = document.querySelector('.nt-blk[data-unit="' + next + '"]');
    if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
  }

  // Enter puts the caret at the end of the selected block's first text.
  function handleEditBlock() {
    const field = document.querySelector('.nt-blk[data-unit="' + sel + '"] [contenteditable="true"]');
    if (!field) return;
    field.focus();
    const range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(range);
  }

  function handleMoveBlock(dir) {
    const cur = doc.getBlocks();
    const block = cur.find((b) => b.id === sel);
    if (!block || block.type === "h1" || block.type === "standfirst") return;
    const next = nudgeBlock(cur, sel, dir);
    if (!next) { flash("ALREADY AT THE " + (dir < 0 ? "TOP" : "BOTTOM")); return; }
    doc.save(next);
    flash("MOVED " + blockLabel(block.type).toUpperCase() + (dir < 0 ? " UP" : " DOWN"));
    reveal(sel);
  }

  function handleDeleteSelected() {
    const block = doc.getBlocks().find((b) => b.id === sel);
    if (!block) return;
    if (block.type === "h1" || block.type === "standfirst") {
      flash("THE " + blockLabel(block.type).toUpperCase() + " STAYS — CLEAR ITS TEXT INSTEAD");
      return;
    }
    handleDelete(sel);
  }

  function handleInsertFromPalette(item) {
    const n = doc.getBlocks().length;
    const at = Math.max(0, Math.min(n, caretIdxRef.current ?? n));
    const id = insertBlock(at, NEW_BLOCK[item.type]());
    caretIdxRef.current = at + 1;
    flash("ADDED " + item.label.toUpperCase());
    reveal(id);
  }

  function handleSelect(id, index) {
    caretIdxRef.current = index + 1;
    setSel(id);
  }

  function handleDelete(id) {
    const gone = doc.getBlocks().find((x) => x.id === id);
    if (!gone) return;
    doc.save(doc.getBlocks().filter((x) => x.id !== id));
    if (sel === id) setSel(null);
    flash("DELETED " + blockLabel(gone.type).toUpperCase(), false, undoOffer());
  }

  // Undoable, so no "are you sure?" — the flash offers UNDO instead.
  function handleDeleteSection(id) {
    const cur = doc.getBlocks();
    const at = cur.findIndex((x) => x.id === id);
    if (at < 0) return;
    const end = sectionEnd(cur, at);
    const next = cur.slice();
    next.splice(at, end - at);
    doc.save(next);
    setSel(null);
    flash("DELETED " + blockLabel(cur[at].type).toUpperCase() + " · " + plural(end - at, "BLOCK"), false, undoOffer());
  }

  function handleDuplicate(id) {
    const cur = doc.getBlocks();
    const at = cur.findIndex((x) => x.id === id);
    if (at < 0) return;
    const end = sectionEnd(cur, at);
    const copies = cur.slice(at, end).map((x) => ({ ...cloneBlock(x), id: nid() }));
    const next = cur.slice();
    next.splice(end, 0, ...copies);
    doc.save(next);
    flash("DUPLICATED " + blockLabel(cur[at].type).toUpperCase() + (copies.length > 1 ? " · " + plural(copies.length, "BLOCK") : ""));
    reveal(copies[0].id);
  }

  function handleCommitProse(ids, node) {
    // A second blur on the same content must not re-split the same paragraphs.
    if (node.__ntLast === node.innerHTML) return;
    node.__ntLast = node.innerHTML;
    const next = mergeProse(doc.getBlocks(), ids, node);
    if (next) doc.save(next);
  }

  function handleClearSel(e) {
    // Background click only — clicks landing on a block keep their selection.
    if (e.target && e.target.closest && e.target.closest(".nt-blk")) return;
    const s = window.getSelection();
    if (s && !s.isCollapsed) return;
    if (sel || bar) { setSel(null); setBar(null); }
  }

  // Returns whether the new window opened (pop-ups can be blocked).
  function openRendered(autoPrint) {
    const node = document.querySelector("[data-article]");
    if (!node) return false;
    const html = articleHtml(node, fontLinks(active.fonts));
    const win = window.open("", "_blank");
    if (!win) { flash("ALLOW POP-UPS TO OPEN THE " + (autoPrint ? "PDF EXPORT" : "PREVIEW"), true); return false; }
    win.document.write(previewDocument(html, { title: active.title, print: active.layout !== "web", autoPrint }));
    win.document.close();
    return true;
  }

  function handlePreview() {
    openRendered(false);
  }

  // The browser's print engine turns the A4 pages into a vector PDF: choose "Save as PDF".
  function handleExportPdf() {
    if (openRendered(true)) flash("CHOOSE “SAVE AS PDF” IN THE PRINT DIALOG");
  }

  async function handleExportTex() {
    if (texBusyRef.current) return;
    texBusyRef.current = true;
    try {
      const blocks = doc.getBlocks();
      const crops = await framedImages(blocks);
      const { tex, images } = blocksToLatex(blocks, { columns: active.layout === "print-2" ? 2 : 1, crops });
      const name = texFileName(blocks);
      const blob = images.length
        ? makeZip([{ name: "main.tex", data: new TextEncoder().encode(tex) }, ...images])
        : new Blob([tex], { type: "application/x-tex" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name + (images.length ? ".zip" : ".tex");
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      flash(images.length
        ? "EXPORTED " + name.toUpperCase() + ".ZIP WITH " + plural(images.length, "PHOTO") + " — UPLOAD TO OVERLEAF"
        : "EXPORTED " + name.toUpperCase() + ".TEX");
    } catch (err) {
      console.error("[Compose] .tex export failed", err);
      flash("COULDN’T EXPORT THE .TEX — " + String((err && err.message) || err).toUpperCase(), true);
    } finally {
      texBusyRef.current = false;
    }
  }

  // Rewrites the whole article from a small rail button, so it still asks first.
  function handleReset() {
    if (!window.confirm("Replace this whole article with the " + template.label + " starter page? (Ctrl+Z brings it back.)")) return;
    doc.save(createStarterBlocks(template.key));
    setSel(null);
    flash("RESET TO THE " + template.label.toUpperCase() + " STARTER PAGE", false, undoOffer());
  }

  function resetEditing() {
    setSel(null);
    setBar(null);
    caretIdxRef.current = null;
  }

  function handlePickTemplate(key) {
    workspace.createDoc(key);
    setPickerOpen(false);
    resetEditing();
    flash("OPENED A NEW " + TEMPLATES[key].label.toUpperCase() + " DOCUMENT");
  }

  function handleSelectDoc(id) {
    if (id === active?.id) return;
    document.activeElement?.blur?.();
    workspace.selectDoc(id);
    resetEditing();
  }

  // Closing a tab can be undone. The last tab still asks, because the template picker that
  // follows would cover the UNDO button.
  function handleCloseDoc(d) {
    const index = workspace.docs.findIndex((x) => x.id === d.id);
    if (workspace.docs.length === 1) {
      if (!window.confirm("Close “" + d.title + "”? It’s your only tab, so its content will be deleted.")) return;
      workspace.closeDoc(d.id);
      doc.forget(d.id);
      resetEditing();
      return;
    }
    if (closedRef.current) doc.forget(closedRef.current.doc.id);
    closedRef.current = { doc: d, index };
    workspace.closeDoc(d.id);
    resetEditing();
    flash("CLOSED “" + d.title.toUpperCase() + "”", false, { label: "UNDO", run: handleReopenDoc });
  }

  function handleReopenDoc() {
    const closed = closedRef.current;
    if (!closed) return;
    closedRef.current = null;
    document.activeElement?.blur?.();
    workspace.reopenDoc(closed.doc, closed.index);
    resetEditing();
    flash("REOPENED “" + closed.doc.title.toUpperCase() + "”");
  }

  function handleDocTitle(text) {
    if (!active) return;
    const title = text.replace(/\s+/g, " ").trim();
    if (title === active.title) return;
    workspace.updateDoc(active.id, { title: title || template.label });
    if (!title) flash("A DOCUMENT NEEDS A TITLE — NAMED IT “" + template.label.toUpperCase() + "”");
  }

  // Preset and reset replace every font setting at once, and aren't in the page's undo history.
  function replaceFonts(next, msg) {
    const id = active.id;
    const before = active.fonts;
    workspace.updateDoc(id, { fonts: next });
    flash(msg, false, { label: "UNDO", run: () => { workspace.updateDoc(id, { fonts: before }); flash("FONTS RESTORED"); } });
  }

  // Font settings belong to the active tab and start from its template's typography.
  const fonts = active && {
    fonts: active.fonts,
    templatePreset: template.fontPreset,
    setLevel: (level, patch) => workspace.updateDoc(active.id, (d) => ({ fonts: { ...d.fonts, [level]: { ...d.fonts[level], ...patch } } })),
    applyPreset: (id) => replaceFonts(presetSettings(id), "APPLIED THE " + presetById(id).label.toUpperCase() + " FONTS"),
    reset: () => replaceFonts(presetSettings(template.fontPreset), "RESET TO THE TEMPLATE FONTS"),
  };

  return (
    <div data-shell="" className="compose-shell" style={{ zoom, height: `calc(100vh / ${zoom})` }}>
      <TopBar
        docTitle={active ? active.title : ""}
        onDocTitle={handleDocTitle}
        templateKey={active ? template.key : null}
        layout={active ? active.layout : "web"}
        onLayout={active ? (layout) => workspace.updateDoc(active.id, { layout }) : null}
        onPreview={active ? handlePreview : null}
        onExportPdf={active && active.layout !== "web" ? handleExportPdf : null}
        note={note}
        noteErr={noteErr}
        noteAction={noteAction}
        onNoteAction={runAction}
        saveState={workspace.saveState}
        busy={busy || filler.building.length > 0}
        zoom={zoom}
        defaultZoom={defaultZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        exported={exporter.exported}
        exporting={exporter.exporting}
        onExport={exporter.copyHtml}
        onDownloadHtml={exporter.downloadHtml}
        onExportTex={active && template.theme.texExport ? handleExportTex : null}
        onImport={importer.openImport}
      />

      <div className="compose-body">
        <IconRail
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen(!panelOpen)}
          onTemplates={() => setPickerOpen(true)}
          onImport={importer.openImport}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={exporter.copyHtml}
          onSettings={() => setSettingsOpen(true)}
          onReset={handleReset}
        />
        <ElementsPanel
          open={panelOpen}
          allowed={template.blocks}
          onInsert={handleInsertFromPalette}
          onDragStart={drag.startNewDrag}
          onDragEnd={drag.clearDrop}
        />
        <div className="compose-workspace">
          <DocTabs
            docs={workspace.docs}
            activeId={active ? active.id : null}
            onSelect={handleSelectDoc}
            onClose={handleCloseDoc}
            onNew={() => setPickerOpen(true)}
          />
          {active && (
            <Canvas
              key={active.id}
              blocks={doc.blocks}
              sel={sel}
              building={filler.building}
              look={{ ...template.look, ...fontVars(active.fonts) }}
              theme={template.theme}
              layout={active.layout}
              zoom={zoom}
              allowed={template.blocks}
              drop={drag.drop}
              readTime={Math.max(1, Math.round(countWords(doc.blocks) / 220))}
              onClearSel={handleClearSel}
              onSelect={handleSelect}
              onCaret={(index) => { caretIdxRef.current = index; }}
              onPatch={doc.patch}
              onDelete={handleDelete}
              onDeleteSection={handleDeleteSection}
              onDuplicate={handleDuplicate}
              onCommitProse={handleCommitProse}
              onShowDrop={drag.showDrop}
              onDropAt={drag.dropAt}
              onMoveStart={drag.startMoveDrag}
              onDragEnd={drag.clearDrop}
              onNotice={flash}
            />
          )}
        </div>
      </div>

      {bar && <FormatToolbar bar={bar} zoom={zoom} />}

      {settingsOpen && fonts && (
        <SettingsModal aiConfig={aiConfig} onSave={saveAi} fonts={fonts} onClose={() => setSettingsOpen(false)} />
      )}

      {importer.importOpen && <ImportModal importer={importer} busy={busy} templateLabel={template.label} />}

      {(pickerOpen || !active) && (
        <TemplatePicker canClose={!!active} onPick={handlePickTemplate} onClose={() => setPickerOpen(false)} />
      )}

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
