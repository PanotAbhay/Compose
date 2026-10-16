import { TEMPLATES } from "../../../data/index.js";
import { useDialog } from "../../../hooks/useDialog.js";
import "./TemplatePicker.css";

function previewHeadline(h1) {
  return { textAlign: h1.textAlign, fontFamily: h1.fontFamily, fontWeight: h1.fontWeight, borderTop: h1.borderTop && "3px solid var(--ink)", paddingTop: h1.borderTop && 6 };
}

// A miniature page drawn with the template's own CSS variables, so the card shows its real look.
function TemplatePreview({ template }) {
  return (
    <div className="template-preview" style={template.look}>
      <div className="template-preview-headline" style={previewHeadline(template.theme.h1)}>{template.starter[0].html}</div>
      <div className="template-preview-line template-preview-line--short"></div>
      <div className="template-preview-accent"></div>
      <div className="template-preview-line"></div>
      <div className="template-preview-line"></div>
      <div className="template-preview-line template-preview-line--short"></div>
    </div>
  );
}

export function TemplatePicker({ canClose, onPick, onClose }) {
  // With no tab open there is nothing behind the picker to go back to, so Escape does nothing.
  const ref = useDialog({ onClose: canClose ? onClose : null });

  return (
    <div className="template-overlay">
      <div ref={ref} className="template-window" role="dialog" aria-modal="true" aria-labelledby="template-title" tabIndex={-1}>
        <div className="template-head">
          <div>
            <div className="template-kicker">NEW DOCUMENT</div>
            <div className="template-title" id="template-title">Choose a template</div>
            <div className="template-desc">The template sets the look, the elements you can add and how the AI formats an import, and stays fixed for this document. It opens in a new tab with a starter page to edit.</div>
          </div>
          {canClose && <button className="template-close" title="Close" aria-label="Close" onClick={onClose}><span className="ms template-close-icon" aria-hidden="true">close</span></button>}
        </div>
        <div className="template-grid">
          {Object.values(TEMPLATES).map((t) => (
            <button key={t.key} className="template-card" onClick={() => onPick(t.key)}>
              <TemplatePreview template={t} />
              <div className="template-card-body">
                <div className="template-card-name">
                  <span className="ms template-card-icon" aria-hidden="true">{t.icon}</span>
                  {t.label}
                </div>
                <div className="template-card-desc">{t.description}</div>
                <div className="template-card-meta">{t.blocks.length} ELEMENT TYPES</div>
              </div>
            </button>
          ))}
        </div>
        <div className="template-foot">To try the same content in another template, open another tab with that template and import or paste it there. Each tab keeps its own fonts and history.</div>
      </div>
    </div>
  );
}
