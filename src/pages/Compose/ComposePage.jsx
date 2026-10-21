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
import { NEW_BLOCK, TEMPLATES, CHAPTER_TYPES } from "../../data/index.js";
import { createStarterBlocks, cloneBlock, nid, sectionEnd, mergeProse, countWords } from "../../utils/blocks.js";
import { articleHtml, previewDocument } from "../../utils/exportHtml.js";
import { blocksToLatex, texFileName } from "../../utils/latexExport.js";
import { makeZip } from "../../utils/zip.js";
import { framedImages } from "../../utils/imageCrop.js";
import { downloadBlob } from "../../utils/dom.js";
import { fontLinks, fontVars } from "../../utils/fonts.js";
import { presetSettings } from "../../data/fontSystems.js";
import { TopBar } from "./components/TopBar.jsx";
import { IconRail } from "./components/IconRail.jsx";
import { ElementsPanel } from "./components/ElementsPanel.jsx";
import { Canvas } from "./components/Canvas.jsx";
import { FormatToolbar } from "./components/FormatToolbar.jsx";
import { SettingsModal } from "./components/SettingsModal.jsx";
import { ImportModal } from "./components/ImportModal.jsx";
import { TemplatePicker } from "./components/TemplatePicker.jsx";
import { DocTabs } from "./components/DocTabs.jsx";
import "./ComposePage.css";

export function ComposePage() {
  const { note, noteErr, setNoteErr, flash } = useFlash();
  const workspace = useWorkspace(flash);
  const { active } = workspace;
  const doc = useDocument({ doc: active, updateDoc: workspace.updateDoc, flash });
  const { zoom, zoomIn, zoomOut } = useZoom();
  const { aiConfig, saveAi } = useAiSettings();
  const [bar, setBar] = useSelectionBar();
  // Everything below follows the active tab; its template never changes.
  const template = TEMPLATES[active ? active.templateKey : "news"];

  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Where palette clicks insert; tracked without re-rendering on every caret move.
  const caretIdxRef = useRef(null);

  function insertBlock(index, block) {
    const id = doc.insertAt(index, block);
    drag.clearDrop();
    return id;
  }

  const filler = useAiFill({ getBlocks: doc.getBlocks, save: doc.save, flash, aiConfig, rules: template.aiRules });
  const drag = useBlockDrag({ getBlocks: doc.getBlocks, save: doc.save, insertBlock, onFill: filler.fillFromText });
  const importer = useImport({ busy, setBusy, flash, aiConfig, save: doc.save, setNoteErr, template });
  const exporter = useExport({ docTitle: active ? active.title : "", fonts: active ? active.fonts : null, flash });

  function handleUndo() {
    if (doc.undo()) setSel(null);
  }

  function handleRedo() {
    if (doc.redo()) setSel(null);
  }

  useShortcuts({
    onEscape: () => { setSel(null); setBar(null); },
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  function handleInsertFromPalette(item) {
    const n = doc.getBlocks().length;
    const at = Math.max(0, Math.min(n, caretIdxRef.current ?? n));
    insertBlock(at, NEW_BLOCK[item.type]());
    caretIdxRef.current = at + 1;
    flash("ADDED " + item.label.toUpperCase());
  }

  function handleSelect(id, index) {
    caretIdxRef.current = index + 1;
    setSel(id);
  }

  function handleDelete(id) {
    doc.save(doc.getBlocks().filter((x) => x.id !== id));
    if (sel === id) setSel(null);
  }

  function handleDeleteSection(id) {
    const cur = doc.getBlocks();
    const at = cur.findIndex((x) => x.id === id);
    if (at < 0) return;
    const end = sectionEnd(cur, at);
    const what = CHAPTER_TYPES.includes(cur[at].type) ? cur[at].type : "sub-heading";
    if (!window.confirm("Delete this " + what + " and the " + (end - at - 1) + " blocks under it?")) return;
    const next = cur.slice();
    next.splice(at, end - at);
    doc.save(next);
    setSel(null);
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

  function openRendered(autoPrint) {
    const node = document.querySelector("[data-article]");
    if (!node) return;
    const html = articleHtml(node, fontLinks(active.fonts));
    const win = window.open("", "_blank");
    if (!win) { flash("ALLOW POP-UPS TO OPEN THE " + (autoPrint ? "PDF EXPORT" : "PREVIEW"), true); return; }
    win.document.write(previewDocument(html, { title: active.title, print: active.layout !== "web", autoPrint }));
    win.document.close();
  }

  function handlePreview() {
    openRendered(false);
  }

  // The browser's print engine turns the A4 pages into a vector PDF: choose "Save as PDF".
  function handleExportPdf() {
    openRendered(true);
    flash("CHOOSE “SAVE AS PDF” IN THE PRINT DIALOG");
  }

  async function handleExportTex() {
    const blocks = doc.getBlocks();
    const crops = await framedImages(blocks);
    const { tex, images } = blocksToLatex(blocks, { columns: active.layout === "print-2" ? 2 : 1, crops });
    const name = texFileName(blocks);
    const blob = images.length
      ? makeZip([{ name: "main.tex", data: new TextEncoder().encode(tex) }, ...images])
      : new Blob([tex], { type: "application/x-tex" });
    downloadBlob(blob, name + (images.length ? ".zip" : ".tex"));
    flash(images.length
      ? "EXPORTED " + name.toUpperCase() + ".ZIP WITH " + images.length + " PHOTO" + (images.length > 1 ? "S" : "") + " — UPLOAD TO OVERLEAF"
      : "EXPORTED " + name.toUpperCase() + ".TEX");
  }

  function handleReset() {
    if (window.confirm("Clear the article and start over from the " + template.label + " starter page?")) doc.save(createStarterBlocks(template.key));
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

  function handleCloseDoc(d) {
    if (!window.confirm("Close “" + d.title + "”? Its content will be deleted.")) return;
    workspace.closeDoc(d.id);
    doc.forget(d.id);
    resetEditing();
  }

  // Font settings belong to the active tab and start from its template's typography.
  const fonts = active && {
    fonts: active.fonts,
    templatePreset: template.fontPreset,
    setLevel: (level, patch) => workspace.updateDoc(active.id, (d) => ({ fonts: { ...d.fonts, [level]: { ...d.fonts[level], ...patch } } })),
    applyPreset: (id) => workspace.updateDoc(active.id, { fonts: presetSettings(id) }),
    reset: () => workspace.updateDoc(active.id, { fonts: presetSettings(template.fontPreset) }),
  };

  return (
    <div data-shell="" className="compose-shell" style={{ zoom, height: `calc(100vh / ${zoom})` }}>
      <TopBar
        docTitle={active ? active.title : ""}
        onDocTitle={(title) => active && workspace.updateDoc(active.id, { title: title.trim() || template.label })}
        templateKey={active ? template.key : null}
        layout={active ? active.layout : "web"}
        onLayout={active ? (layout) => workspace.updateDoc(active.id, { layout }) : null}
        onPreview={active ? handlePreview : null}
        onExportPdf={active && active.layout !== "web" ? handleExportPdf : null}
        note={note}
        noteErr={noteErr}
        busy={busy || filler.building.length > 0}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
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

      {importer.importOpen && <ImportModal importer={importer} busy={busy} noteErr={noteErr} />}

      {(pickerOpen || !active) && (
        <TemplatePicker canClose={!!active} onPick={handlePickTemplate} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
