import { EditableText } from "./EditableText.jsx";

// Captions are set at body size, as LaTeX's article class does.
const CAPTION = { textAlign: "center", fontFamily: "var(--font-serif)", fontSize: "var(--body-size)", lineHeight: "var(--body-lh)", letterSpacing: "0", color: "var(--ink)" };

// LaTeX-style numbered caption: "Figure 2: Estimated usable rooftop area." — the label is fixed, the text editable.
export function Caption({ kind, number, value, onCommit, placeholder = "Caption", style }) {
  return (
    <div style={{ ...CAPTION, ...style }}>
      <span>{kind} {number}: </span>
      <EditableText as="span" data-ph={placeholder} value={value} onCommit={onCommit} />
    </div>
  );
}
