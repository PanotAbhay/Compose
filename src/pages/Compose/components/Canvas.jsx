import { useState, useRef, useLayoutEffect } from "react";
import { PROSE_TYPES, SECTION_TYPES, CHAPTER_TYPES, IMAGE_TYPES } from "../../../data/index.js";
import { sectionEnd } from "../../../utils/blocks.js";
import { A4, planPages } from "../../../utils/pagination.js";
import { BlockFrame } from "./BlockFrame.jsx";
import { ProseBlock } from "./blocks/ProseBlock.jsx";
import { DropLine } from "./DropLine.jsx";
import "./Canvas.css";

const MASTHEAD_TYPES = ["h1", "standfirst", "byline"];
// Two-column pages set everything smaller, as a typesetter would for narrow columns — unless the
// template already uses true print sizes (LaTeX's 10pt type stays 10pt in two columns).
const TWO_COLUMN_SCALE = 0.8;
// Blocks that may float past following paragraphs when they don't fit (see planPages).
const FLOAT_TYPES = ["image", "pair", "gallery", "chart", "line", "poll", "table", "stats", "timeline", "nutshell"];

// Inline because Copy HTML and Preview export the pages as they are.
const PAGE_STYLE = {
  position: "relative",
  width: A4.width,
  minHeight: A4.height,
  boxSizing: "border-box",
  padding: A4.margin,
  margin: "0 auto 28px",
  background: "var(--paper)",
  boxShadow: "0 10px 34px rgba(0,0,0,0.38)",
  breakAfter: "page",
};
const FOLIO_STYLE = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 30,
  textAlign: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--muted)",
};

// Chapters are always numbered (1, 2… and appendices A, B…). With `all`, so are LaTeX-style
// sections ("2", "2.1"), figures and tables. Keyed by block id.
function numberBlocks(blocks, all) {
  const numbers = {};
  let chapter = 0;
  let appendix = 0;
  let section = 0;
  let subsection = 0;
  let figure = 0;
  let table = 0;
  blocks.forEach((b) => {
    if (b.type === "chapter") { chapter += 1; numbers[b.id] = String(chapter); }
    else if (b.type === "appendix") { appendix += 1; numbers[b.id] = String.fromCharCode(64 + Math.min(appendix, 26)); }
    else if (!all) return;
    else if (b.type === "h2") { section += 1; subsection = 0; numbers[b.id] = String(section); }
    else if (b.type === "h3") { subsection += 1; numbers[b.id] = section ? section + "." + subsection : String(subsection); }
    else if (IMAGE_TYPES.includes(b.type) || b.type === "chart" || b.type === "line") { figure += 1; numbers[b.id] = String(figure); }
    else if (b.type === "table") { table += 1; numbers[b.id] = String(table); }
  });
  return numbers;
}

// On paper, photos stay inside the text block, and narrow columns get compact stats and tables.
function printTheme(theme, columns) {
  // A template's own two-column rules come first (LaTeX moves the abstract into the first column).
  if (columns === 2 && theme.twoColumn) theme = { ...theme, ...theme.twoColumn };
  // Templates with true print sizes (LaTeX) already set their own figure spacing and table type.
  if (theme.twoColumnScale === 1) return theme;
  const t = { ...theme, figure: { ...theme.figure, margin: "24px 0" } };
  if (columns !== 2) return t;
  return {
    ...t,
    stats: { ...theme.stats, perRow: 2 },
    table: { ...theme.table, cell: { ...(theme.table && theme.table.cell), fontSize: 13 } },
  };
}

// Selecting a heading highlights every block in its section.
function liveRange(blocks, sel) {
  const si = sel ? blocks.findIndex((b) => b.id === sel) : -1;
  if (si < 0 || !SECTION_TYPES.includes(blocks[si].type)) return [-1, -1];
  return [si, sectionEnd(blocks, si)];
}

function mastheadCount(blocks, types) {
  let n = 0;
  while (n < blocks.length && types.includes(blocks[n].type)) n += 1;
  return n;
}

// The page each heading lands on, for a contents block (1-based, as the folios).
function pageNumbers(pages) {
  const at = {};
  pages.forEach((page, pi) => {
    [page.masthead, ...page.columns].forEach((items) => items.forEach((it) => {
      const id = typeof it === "string" ? it : it.id;
      if (!(id in at)) at[id] = pi + 1;
    }));
  });
  return at;
}

function plainText(html) {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

// Heights of every block and paragraph (and paragraphs' line heights), in unzoomed CSS px.
// Paragraphs use a fixed gap so a height never depends on where it lands, which would make
// the layout oscillate. Code listings and contents ([data-split]) are measured whole even when
// drawn as slices, with where their lines start.
function measureUnits(root, paraGap) {
  const heights = {};
  const lines = {};
  const splits = {};
  root.querySelectorAll("[data-unit]").forEach((el) => { heights[el.getAttribute("data-unit")] = el.offsetHeight; });
  root.querySelectorAll("[data-prose]").forEach((wrap) => {
    const ids = JSON.parse(wrap.getAttribute("data-ids") || "[]");
    const ps = Array.from(wrap.children);
    ids.forEach((id, k) => {
      // Paragraphs typed but not yet saved add to the last saved one.
      const extra = k === ids.length - 1 ? ps.slice(ids.length).reduce((n, p) => n + p.offsetHeight + paraGap, 0) : 0;
      heights[id] = (ps[k] ? ps[k].offsetHeight + paraGap : 40) + extra;
      if (ps[k]) {
        const cs = getComputedStyle(ps[k]);
        lines[id] = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      }
    });
  });
  root.querySelectorAll("[data-split]").forEach((el) => {
    const id = el.getAttribute("data-split");
    const body = el.querySelector("[data-split-lines]");
    // The block frame adds 1px of padding above and below.
    heights[id] = el.offsetHeight + 2;
    const lineHeight = body ? parseFloat(getComputedStyle(body).lineHeight) : 0;
    if (lineHeight && body.offsetHeight >= lineHeight * 4) splits[id] = { lineHeight, textHeight: body.offsetHeight, top: body.offsetTop };
  });
  return { heights, lines, splits };
}

function sameHeights(a, b) {
  const keys = Object.keys(b);
  return keys.length === Object.keys(a).length && keys.every((k) => Math.abs((a[k] || 0) - b[k]) < 2);
}

// The insertion point nearest the pointer, among boundaries in the column under it. Works the
// same for one continuous page or many A4 pages with two columns. Returns the line to draw in
// unzoomed px relative to `root`, and the prose context the AI uses to fill dropped elements.
function dropBoundary(root, x, y, zoom) {
  const rr = root.getBoundingClientRect();
  const bounds = [];
  root.querySelectorAll("[data-drop-index]").forEach((el) => {
    const index = Number(el.getAttribute("data-drop-index"));
    const r = el.getBoundingClientRect();
    bounds.push({ index, y: r.top, r });
    if (!el.hasAttribute("data-drop-tail")) bounds.push({ index: index + 1, y: r.bottom, r });
  });
  root.querySelectorAll("[data-drop-start]").forEach((el) => {
    const start = Number(el.getAttribute("data-drop-start"));
    const prose = el.querySelector("[data-prose]");
    const ids = JSON.parse(prose.getAttribute("data-ids") || "[]");
    const ps = Array.from(prose.children).slice(0, ids.length);
    // A slice of a split paragraph hides edges outside its window; those are dropped on the other slice.
    const wr = el.getBoundingClientRect();
    const visible = (yy) => yy >= wr.top - 2 && yy <= wr.bottom + 2;
    ps.forEach((p, k) => {
      const r = p.getBoundingClientRect();
      if (visible(r.top)) bounds.push({ index: start + k, y: r.top, r, prose: { groupIds: ids, adjacentId: ids[Math.max(0, k - 1)] } });
    });
    const last = ps[ps.length - 1];
    if (last) {
      const r = last.getBoundingClientRect();
      if (visible(r.bottom)) bounds.push({ index: start + ids.length, y: r.bottom, r, prose: { groupIds: ids, adjacentId: ids[ids.length - 1] } });
    }
  });
  if (!bounds.length) return null;

  const inColumn = bounds.filter((b) => x >= b.r.left - 30 && x <= b.r.right + 30);
  const pool = inColumn.length ? inColumn : bounds;
  const best = pool.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a));
  return {
    index: best.index,
    prose: best.prose || null,
    line: {
      top: Math.round((best.y - rr.top) / zoom) - 1,
      left: Math.round((best.r.left - rr.left) / zoom),
      width: Math.round(best.r.width / zoom),
    },
  };
}

export function Canvas({
  blocks,
  sel,
  building,
  look,
  theme: baseTheme,
  layout,
  zoom,
  allowed,
  drop,
  readTime,
  onClearSel,
  onSelect,
  onCaret,
  onPatch,
  onDelete,
  onDeleteSection,
  onDuplicate,
  onCommitProse,
  onShowDrop,
  onDropAt,
  onMoveStart,
  onDragEnd,
  onNotice,
}) {
  const print = layout === "print-1" || layout === "print-2";
  const columns = layout === "print-2" ? 2 : 1;
  const scale = columns === 2 ? (baseTheme.twoColumnScale ?? TWO_COLUMN_SCALE) : 1;
  const margin = baseTheme.pageMargin || A4.margin;
  const pageStyle = { ...PAGE_STYLE, padding: margin };
  // Charts need the column count to rotate tick labels as the .tex export will.
  const theme = { ...(print ? printTheme(baseTheme, columns) : baseTheme), pageColumns: columns };
  const innerRef = useRef(null);
  const [measured, setMeasured] = useState({ heights: {}, lines: {}, splits: {} });
  // Re-layout passes since the content last changed; a hard stop guards against any oscillation.
  const passesRef = useRef({ blocks: null, count: 0 });
  const { heights, lines, splits } = measured;
  const [liveFrom, liveTo] = liveRange(blocks, sel);
  const numbers = numberBlocks(blocks, !!(theme.numbering || theme.captions));
  const chaptered = blocks.some((b) => CHAPTER_TYPES.includes(b.type));
  const indexOf = Object.fromEntries(blocks.map((b, i) => [b.id, i]));
  const paraGap = theme.paragraphIndent ? 0 : 18;

  const masthead = mastheadCount(blocks, theme.masthead || MASTHEAD_TYPES);
  const pages = print
    ? planPages(
      blocks.map((b) => {
        const height = heights[b.id] ?? 40;
        const unit = {
          id: b.id,
          height,
          keepWithNext: SECTION_TYPES.includes(b.type),
          float: FLOAT_TYPES.includes(b.type),
          // A book's chapters and contents each start a page.
          pageBreak: CHAPTER_TYPES.includes(b.type) || (b.type === "toc" && chaptered),
        };
        // Paragraphs can split across columns and pages at a line break.
        if (PROSE_TYPES.includes(b.type) && lines[b.id]) Object.assign(unit, { lineHeight: lines[b.id], textHeight: height - paraGap, lede: b.type === "dropcap" });
        else if (splits[b.id]) Object.assign(unit, splits[b.id]);
        return unit;
      }),
      { columns, mastheadCount: masthead, scale, margin },
    )
    : null;

  const pageOf = pages ? pageNumbers(pages) : {};
  const outline = blocks.some((b) => b.type === "toc")
    ? blocks.filter((b) => SECTION_TYPES.includes(b.type)).map((b) => ({ id: b.id, type: b.type, number: numbers[b.id], text: plainText(b.html), page: pageOf[b.id] }))
    : [];

  // Re-measure after every render; a changed height re-flows the pages once.
  useLayoutEffect(() => {
    if (!print || !innerRef.current) return;
    const passes = passesRef.current;
    if (passes.blocks !== blocks) { passes.blocks = blocks; passes.count = 0; }
    const next = measureUnits(innerRef.current, paraGap);
    if (sameHeights(heights, next.heights) || passes.count >= 6) return;
    passes.count += 1;
    setMeasured(next);
  });

  function handleDragOver(e) {
    e.preventDefault();
    const b = dropBoundary(innerRef.current, e.clientX, e.clientY, zoom);
    if (b) onShowDrop(b.index, b.line);
  }

  function handleDrop(e) {
    e.preventDefault();
    const b = dropBoundary(innerRef.current, e.clientX, e.clientY, zoom);
    if (b) onDropAt(b.index, b.prose);
    else onDragEnd();
  }

  // Blocks render one by one; consecutive paragraphs share one text field. Items are block
  // ids, or { id, show, skip } for a paragraph split across a column or page break.
  function renderUnits(items, { span = false, side = "left" } = {}) {
    const list = items.map((it) => (typeof it === "string" ? { id: it } : it));
    const out = [];
    let i = 0;
    while (i < list.length) {
      const index = indexOf[list[i].id];
      const block = blocks[index];
      if (PROSE_TYPES.includes(block.type)) {
        const group = [list[i]];
        while (
          i + group.length < list.length
          && !group[group.length - 1].show
          && !list[i + group.length].skip
          && indexOf[list[i + group.length].id] === index + group.length
          && PROSE_TYPES.includes(blocks[index + group.length].type)
        ) {
          group.push(list[i + group.length]);
        }
        const members = group.map((g) => blocks[indexOf[g.id]]);
        const last = group[group.length - 1];
        // The visible part of a group whose last paragraph continues in the next column.
        const clip = last.show ? group.slice(0, -1).reduce((n, g) => n + (heights[g.id] || 0), 0) + last.show - (group.length > 1 && group[0].skip ? group[0].skip : 0) : null;
        out.push(
          <ProseBlock
            key={"prose" + block.id + (group[0].skip ? "-" + group[0].skip : "")}
            members={members}
            theme={theme}
            start={index}
            continued={index > 0 && PROSE_TYPES.includes(blocks[index - 1].type)}
            skip={group[0].skip || 0}
            clip={clip}
            onCaret={onCaret}
            onCommit={onCommitProse}
          />,
        );
        i += group.length;
        continue;
      }
      const { skip, show } = list[i];
      out.push(
        <BlockFrame
          key={block.id + (skip ? "-" + skip : "")}
          block={block}
          index={index}
          sectionSize={sectionEnd(blocks, index) - index}
          selected={sel === block.id}
          inLive={index >= liveFrom && index < liveTo}
          building={building.includes(block.id)}
          allowed={allowed}
          theme={theme}
          number={numbers[block.id]}
          outline={outline}
          slice={skip || show ? { skip: skip || 0, clip: show || null } : null}
          span={span}
          chromeSide={side}
          readTime={readTime}
          onSelect={onSelect}
          onPatch={(fn) => onPatch(block.id, fn)}
          onDelete={onDelete}
          onDeleteSection={onDeleteSection}
          onDuplicate={onDuplicate}
          onMoveStart={onMoveStart}
          onDragEnd={onDragEnd}
          onNotice={onNotice}
        />,
      );
      i += 1;
    }
    return out;
  }

  const tail = (
    <div
      data-chrome=""
      data-drop-index={blocks.length}
      data-drop-tail=""
      className={`canvas-tail${drop.index === blocks.length ? " canvas-tail--active" : ""}${print ? " canvas-tail--print" : ""}`}
    >
      <span className="canvas-tail-label">Drag elements here</span>
    </div>
  );

  const gap = (theme.columns && theme.columns.columnGap) || 40;
  const rule = theme.columns && theme.columns.columnRule;

  return (
    <div className={`canvas${print ? " canvas--print" : ""}`} style={look} onMouseDown={onClearSel}>
      <div ref={innerRef} className="canvas-inner" onDragOver={handleDragOver} onDrop={handleDrop}>
        {!print && (
          <div data-article="" data-layout="web" style={{ maxWidth: 796, margin: "0 auto", padding: "44px 36px 160px 72px", ...theme.article }}>
            {renderUnits(blocks.map((b) => b.id))}
            {tail}
          </div>
        )}

        {print && (
          <>
            <div data-article="" data-layout={layout} className="print-desk">
              {pages.map((page, pi) => (
                <section key={pi} data-page="" style={pageStyle}>
                  {/* Scaled content keeps the sheet exactly A4: it is laid out wider and zoomed down to fit. */}
                  <div data-page-content="" style={scale !== 1 ? { zoom: scale, width: (A4.width - margin * 2) / scale } : undefined}>
                    {page.masthead.length > 0 && <div data-page-masthead="">{renderUnits(page.masthead, { span: columns === 2 })}</div>}
                    {/* Both columns must be exactly the same width: a paragraph split across them has to wrap identically. */}
                    <div
                      data-page-body=""
                      style={{ position: "relative", display: "grid", gridTemplateColumns: columns === 2 ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)", columnGap: gap, alignItems: "start" }}
                    >
                      {columns === 2 && rule && <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", borderLeft: rule }}></div>}
                      {page.columns.map((ids, ci) => (
                        <div key={ci} data-page-column="">
                          {renderUnits(ids, { side: ci > 0 ? "right" : "left" })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div data-folio="" style={FOLIO_STYLE}>{pi + 1}</div>
                </section>
              ))}
            </div>
            {tail}
          </>
        )}

        <div data-chrome="">
          <DropLine visible={drop.index >= 0 && !!drop.line} top={drop.line ? drop.line.top : 0} left={drop.line ? drop.line.left : 0} width={drop.line ? drop.line.width : 0} />
        </div>
      </div>
    </div>
  );
}
