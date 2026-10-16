import { ModalShell } from "./ModalShell.jsx";
import "./ImportModal.css";

const ERROR_COLOR = "#E8836F";

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length.toLocaleString();
}

export function ImportModal({ importer, busy, templateLabel }) {
  const { raw, setRaw, recovered, fileNote, fileErr, importNote, importErr, reading } = importer;
  const waiting = busy || reading;

  return (
    <ModalShell variant="import" label="Import article" onClose={importer.closeImport}>
      <div className="modal-head">
        <div className="modal-kicker">IMPORT ARTICLE</div>
        <div className="modal-desc">
          {"Paste the raw article. The AI structures it into this tab’s " + templateLabel + " template — headline, sub-heads, quotes and data — without rewriting your copy. It replaces the current page."}
        </div>
      </div>
      <div className="import-sources">
        <button className="import-source-btn" disabled={waiting} onClick={importer.pickDocFile}>
          <span className="ms import-source-icon" aria-hidden="true">upload_file</span>Upload .docx / .pdf / .txt
        </button>
        {recovered.length > 200 && (
          <button className="import-source-btn import-source-btn--restore" title="Load the last article you imported" disabled={waiting} onClick={importer.restoreRecovered}>
            <span className="ms import-source-icon" aria-hidden="true">history</span>{"Restore last article (" + wordCount(recovered) + " words)"}
          </button>
        )}
        <span className="import-file-note" aria-live="polite" style={fileErr ? { color: ERROR_COLOR } : undefined}>{fileNote || "Or paste the text below."}</span>
      </div>
      <textarea
        className="import-textarea"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
        aria-label="Article text"
        placeholder="Paste the full article text here…"
        data-autofocus=""
      ></textarea>
      <div className="import-footer">
        <span className="import-note" aria-live="polite" style={{ color: importErr ? ERROR_COLOR : "rgba(242,239,233,0.55)" }}>{importNote}</span>
        <button className="modal-btn" title={busy ? "Stop formatting and leave the page as it was" : undefined} onClick={importer.closeImport}>Cancel</button>
        <button className="modal-btn" disabled={waiting} onClick={importer.importPlain}>Plain text only</button>
        <button className={`import-ai-btn${busy ? " import-ai-btn--busy" : ""}`} onClick={importer.importAi} disabled={waiting} aria-busy={busy}>
          <span className="ms import-source-icon" aria-hidden="true">auto_awesome</span>{busy ? "Formatting…" : "Format with AI"}
        </button>
      </div>
    </ModalShell>
  );
}
