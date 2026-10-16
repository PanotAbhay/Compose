import { useState } from "react";
import { pressable } from "../../../../utils/dom.js";
import { highlightLines, CODE_LANGS } from "../../../../utils/highlight.js";
import { EditableText } from "./EditableText.jsx";
import { MONO_OVERLINE } from "./articleStyles.js";
import "./CodeBlock.css";

const LINE_HEIGHT = 20;

const BOX = {
  background: "var(--paper-faint)",
  border: "1px solid var(--rule)",
  padding: "12px 16px 12px 0",
};

const LINES = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  lineHeight: LINE_HEIGHT + "px",
  color: "var(--ink)",
};

const GUTTER = {
  flex: "0 0 auto",
  width: 40,
  paddingRight: 14,
  boxSizing: "border-box",
  textAlign: "right",
  fontSize: 10,
  color: "var(--muted-light)",
  userSelect: "none",
};

const TEXTAREA = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  margin: 0,
  padding: "0 0 0 40px",
  border: "none",
  outline: "none",
  resize: "none",
  overflow: "auto hidden",
  background: "transparent",
  font: "inherit",
  lineHeight: "inherit",
  color: "inherit",
  whiteSpace: "pre",
  tabSize: 4,
};

// A numbered code listing. Shown coloured; click it to edit the plain text. In print layouts a
// long listing splits across pages at a line break (`slice`, as for paragraphs; see planPages).
export function CodeBlock({ block, theme, slice, onPatch }) {
  const [editing, setEditing] = useState(false);
  const t = theme.code || {};
  const text = block.text || "";
  const sliced = !editing && slice;

  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false);
  }

  function handleText(e) {
    const v = e.currentTarget.value.replace(/\s+$/, "");
    if (v !== text) onPatch((x) => { x.text = v; });
  }

  function handleInput(e) {
    e.currentTarget.rows = e.currentTarget.value.split("\n").length;
  }

  return (
    <div style={sliced ? { overflow: "hidden", ...(slice.clip != null && { height: slice.clip }) } : undefined}>
      <div
        data-split={block.id}
        style={{ position: "relative", padding: "6px 0 22px", ...(sliced && slice.skip && { marginTop: -slice.skip }) }}
        onBlur={handleBlur}
      >
        {(block.a || editing) && (
          <EditableText
            as="div"
            data-ph="Listing title"
            value={block.a}
            onCommit={(v) => onPatch((x) => { x.a = v.trim(); })}
            style={{ ...MONO_OVERLINE, color: "var(--muted)", marginBottom: 8, ...t.caption }}
          />
        )}
        {editing && (
          <select data-chrome="" className="code-lang" value={block.lang || "text"} onChange={(e) => { const v = e.target.value; onPatch((x) => { x.lang = v; }); }}>
            {CODE_LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        )}
        <div style={{ ...BOX, ...t.wrap }}>
          <div
            data-split-lines=""
            style={{ ...LINES, ...t.text }}
            onClick={() => setEditing(true)}
            {...(!editing && pressable(() => setEditing(true)))}
          >
            {editing ? (
              <textarea
                autoFocus
                spellCheck={false}
                defaultValue={text}
                rows={text.split("\n").length}
                wrap="off"
                onInput={handleInput}
                onBlur={handleText}
                style={TEXTAREA}
              />
            ) : (
              highlightLines(text, block.lang).map((runs, i) => (
                <div key={i} style={{ display: "flex" }}>
                  <span style={GUTTER}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", tabSize: 4 }}>
                    {runs.map((r, k) => (r.color ? <span key={k} style={{ color: r.color }}>{r.text}</span> : r.text))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
