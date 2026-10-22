import { EditableText } from "./EditableText.jsx";
import { FigureHeader } from "./FigureHeader.jsx";
import { Caption } from "./Caption.jsx";
import { RowControls } from "./RowControls.jsx";
import { PgfPlot } from "./PgfPlot.jsx";
import { FIGURE, maxValue, parseValue } from "./articleStyles.js";

const X0 = 40;
const X1 = 628;
const Y_TOP = 22;
const Y_BASE = 212;
const MAX_POINTS = 12;

function plotPoints(rows, max) {
  const n = rows.length;
  return rows.map((r, i) => ({
    x: n === 1 ? (X0 + X1) / 2 : X0 + (X1 - X0) * (i / (n - 1)),
    y: Y_BASE - (Y_BASE - Y_TOP) * (r.value / max),
  }));
}

// Catmull-Rom through the points, expressed as cubic beziers.
function smoothPath(pts) {
  if (!pts.length) return "";
  let d = "M" + pts[0].x.toFixed(1) + "," + pts[0].y.toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || pts[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) +
      " " + p2.x.toFixed(1) + "," + p2.y.toFixed(1);
  }
  return d;
}

export function LineChartBlock({ block, theme, number, onPatch }) {
  const rows = block.bars || [];
  const controls = (
    <RowControls
      noun="POINT"
      onAdd={() => onPatch((x) => {
        if (x.bars.length < MAX_POINTS) x.bars.push({ label: "NEXT", value: x.bars.length ? x.bars[x.bars.length - 1].value : 10 });
      })}
      onRemove={() => onPatch((x) => { if (x.bars.length > 2) x.bars.pop(); })}
    />
  );

  if (theme.charts === "pgfplots") {
    return (
      <figure style={{ ...FIGURE, paddingTop: 18 }}>
        <PgfPlot kind="line" block={block} columns={theme.pageColumns} onPatch={onPatch} />
        <Caption kind="Figure" number={number} placeholder="Trend title" value={block.a} onCommit={(v) => onPatch((x) => { x.a = v; })} style={{ marginTop: 10 }} />
        {controls}
      </figure>
    );
  }

  const max = maxValue(rows);
  const pts = plotPoints(rows, max);
  const linePath = smoothPath(pts);
  const areaPath = linePath
    ? linePath + " L" + pts[pts.length - 1].x.toFixed(1) + "," + Y_BASE + " L" + pts[0].x.toFixed(1) + "," + Y_BASE + " Z"
    : "";

  return (
    <figure style={FIGURE}>
      <FigureHeader block={block} onPatch={onPatch} titlePlaceholder="Trend title" notePlaceholder="Unit" marginBottom={20} />
      <svg viewBox="0 0 640 236" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <line x1="40" y1="22" x2="628" y2="22" stroke="var(--rule-light)" strokeWidth="1"></line>
        <line x1="40" y1="117" x2="628" y2="117" stroke="var(--rule-light)" strokeWidth="1"></line>
        <line x1="40" y1="212" x2="628" y2="212" stroke="var(--rule)" strokeWidth="1"></line>
        <path d={areaPath} fill="var(--red)" fillOpacity="0.06"></path>
        <path d={linePath} fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"></path>
        {pts.map((p, i) => (
          <circle key={block.id + "p" + i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="var(--red)"></circle>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        {rows.map((r, i) => (
          <div key={block.id + "p" + i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <EditableText
              as="span"
              value={String(r.value)}
              onCommit={(v) => onPatch((x) => { x.bars[i].value = parseValue(v, true); })}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)", fontVariantNumeric: "lining-nums" }}
            />
            <EditableText
              as="span"
              data-ph="LABEL"
              value={r.label}
              onCommit={(v) => onPatch((x) => { x.bars[i].label = v; })}
              style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.06em", color: "var(--muted)", textAlign: "center" }}
            />
          </div>
        ))}
      </div>
      {controls}
    </figure>
  );
}
