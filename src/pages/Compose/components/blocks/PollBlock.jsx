import { EditableText } from "./EditableText.jsx";
import { FigureHeader } from "./FigureHeader.jsx";
import { RowControls } from "./RowControls.jsx";
import { FIGURE, MONO_LABEL, maxValue, parseValue } from "./articleStyles.js";

const MAX_ROWS = 7;

export function PollBlock({ block, onPatch }) {
  const bars = block.bars || [];
  const max = maxValue(bars);

  return (
    <figure style={FIGURE}>
      <FigureHeader block={block} onPatch={onPatch} titlePlaceholder="Title" notePlaceholder="% who agree" marginBottom={12} />
      {bars.map((r, i) => (
        <div key={block.id + "r" + i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--rule-light)" }}>
          <EditableText
            as="span"
            data-ph="LABEL"
            value={r.label}
            onCommit={(v) => onPatch((x) => { x.bars[i].label = v; })}
            style={{ ...MONO_LABEL, color: "var(--ink)", width: 170, flex: "none" }}
          />
          <span style={{ flex: 1, height: 8, background: "var(--rule-light)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", borderRadius: "var(--radius-pill)", width: Math.min(100, r.value) + "%", background: r.value === max ? "var(--red)" : "var(--ink)" }}></span>
          </span>
          <EditableText
            as="span"
            value={r.value + "%"}
            onCommit={(v) => onPatch((x) => { x.bars[i].value = parseValue(v); })}
            style={{ ...MONO_LABEL, color: "var(--ink)", width: 52, textAlign: "right", flex: "none", fontVariantNumeric: "lining-nums" }}
          />
        </div>
      ))}
      <RowControls
        noun="ROW"
        onAdd={() => onPatch((x) => { if (x.bars.length < MAX_ROWS) x.bars.push({ label: "LABEL", value: 25 }); })}
        onRemove={() => onPatch((x) => { if (x.bars.length > 1) x.bars.pop(); })}
      />
    </figure>
  );
}
