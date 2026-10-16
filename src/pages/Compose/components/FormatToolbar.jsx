import { inlineCodeHtml } from "../../../utils/blocks.js";
import { promptLink, shortcutLabel } from "../../../utils/dom.js";
import "./FormatToolbar.css";

// The selection as inline code, set in the template's monospace font.
function handleCode() {
  const selection = window.getSelection();
  const text = selection ? selection.toString() : "";
  if (text) document.execCommand("insertHTML", false, inlineCodeHtml(text));
}

function handleLead() {
  document.execCommand("foreColor", false, "#1E1E1E");
  document.execCommand("bold");
}

export function FormatToolbar({ bar, zoom }) {
  return (
    <div
      className="format-bar"
      role="toolbar"
      aria-label="Text formatting"
      style={{ left: Math.round(bar.x / zoom) + "px", top: Math.round(bar.y / zoom) + "px" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button className="format-bar-btn" title={"Bold (" + shortcutLabel("Ctrl+B") + ")"} aria-label="Bold" onClick={() => document.execCommand("bold")}><span className="ms format-bar-icon" aria-hidden="true">format_bold</span></button>
      <button className="format-bar-btn" title={"Italic (" + shortcutLabel("Ctrl+I") + ")"} aria-label="Italic" onClick={() => document.execCommand("italic")}><span className="ms format-bar-icon" aria-hidden="true">format_italic</span></button>
      <button className="format-bar-btn" title={"Add a link (" + shortcutLabel("Ctrl+K") + ")"} aria-label="Add a link" onClick={promptLink}><span className="ms format-bar-icon" aria-hidden="true">link</span></button>
      <button className="format-bar-btn" title="Inline code" aria-label="Inline code" onClick={handleCode}><span className="ms format-bar-icon" aria-hidden="true">code</span></button>
      <button className="format-bar-btn" title="Highlight as lead sentence" aria-label="Highlight as lead sentence" onClick={handleLead}><span className="ms format-bar-icon" aria-hidden="true">format_ink_highlighter</span></button>
    </div>
  );
}
