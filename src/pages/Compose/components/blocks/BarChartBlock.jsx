import { EditableText } from "./EditableText.jsx";
import { FigureHeader } from "./FigureHeader.jsx";
import { Caption } from "./Caption.jsx";
import { RowControls } from "./RowControls.jsx";
import { PgfPlot } from "./PgfPlot.jsx";
import { FIGURE, maxValue, parseValue } from "./articleStyles.js";

const MAX_BARS = 7;

export function BarChartBlock({ block, theme, number, onPatch }) {
  const bars = block.bars || [];
  const max = maxValue(bars);
  const controls = (
    <RowControls
      noun="BAR"
      onAdd={() => onPatch((x) => { if (x.bars.length < MAX_BARS) x.bars.push({ label: "Label", value: 25 }); })}
      onRemove={() => onPatch((x) => { if (x.bars.length > 1) x.bars.pop(); })}
    />
  );

  if (theme.charts === "pgfplots") {
    return (
      <figure style={{ ...FIGURE, paddingTop: 18 }}>
        <PgfPlot kind="bar" block={block} columns={theme.pageColumns} onPatch={onPatch} />
        <Caption kind="Figure" number={number} placeholder="Chart title" value={block.a} onCommit={(v) => onPatch((x) => { x.a = v; })} style={{ marginTop: 10 }} />
        {controls}
      </figure>
    );
  }

  return (
    <figure style={FIGURE}>
      <FigureHeader block={block} onPatch={onPatch} titlePlaceholder="Chart title" notePlaceholder="Unit" marginBottom={24} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 190, borderBottom: "1px solid var(--rule)" }}>
        {bars.map((r, i) => (
          <div key={block.id + "r" + i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ position: "relative", flex: "none", height: Math.max(3, Math.round((r.value / max) * 100)) + "%", background: r.value === max ? "var(--red)" : "var(--ink)" }}>
              <EditableText
                as="span"
                value={String(r.value)}
                onCommit={(v) => onPatch((x) => { x.bars[i].value = parseValue(v); })}
                style={{ position: "absolute", left: 0, right: 0, bottom: "100%", paddingBottom: 7, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", textAlign: "center", fontVariantNumeric: "lining-nums" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 9 }}>
        {bars.map((r, i) => (
          <EditableText
            key={block.id + "r" + i}
            data-ph="LABEL"
            value={r.label}
            onCommit={(v) => onPatch((x) => { x.bars[i].label = v; })}
            style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.06em", color: "var(--muted)", lineHeight: 1.4 }}
          />
        ))}
      </div>
      {controls}
    </figure>
  );
}
