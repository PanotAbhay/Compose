import { TEXTISH_TYPES, SECTION_TYPES, IMAGE_TYPES, TEXT_TYPE_OPTIONS, blockLabel } from "../../../data/index.js";
import { pressable, shortcutLabel } from "../../../utils/dom.js";
import { TextBlock } from "./blocks/TextBlock.jsx";
import { BylineBlock } from "./blocks/BylineBlock.jsx";
import { QuoteBlock } from "./blocks/QuoteBlock.jsx";
import { ImagesBlock } from "./blocks/ImagesBlock.jsx";
import { StatsBlock } from "./blocks/StatsBlock.jsx";
import { BarChartBlock } from "./blocks/BarChartBlock.jsx";
import { LineChartBlock } from "./blocks/LineChartBlock.jsx";
import { PollBlock } from "./blocks/PollBlock.jsx";
import { TableBlock } from "./blocks/TableBlock.jsx";
import { TimelineBlock } from "./blocks/TimelineBlock.jsx";
import { NutshellBlock } from "./blocks/NutshellBlock.jsx";
import { DividerBlock } from "./blocks/DividerBlock.jsx";
import { CodeBlock } from "./blocks/CodeBlock.jsx";
import { ChapterBlock } from "./blocks/ChapterBlock.jsx";
import { TocBlock } from "./blocks/TocBlock.jsx";
import "./BlockFrame.css";

const BLOCK_BODIES = {
  byline: BylineBlock,
  quote: QuoteBlock,
  stats: StatsBlock,
  chart: BarChartBlock,
  line: LineChartBlock,
  poll: PollBlock,
  table: TableBlock,
  timeline: TimelineBlock,
  nutshell: NutshellBlock,
  divider: DividerBlock,
  code: CodeBlock,
  chapter: ChapterBlock,
  appendix: ChapterBlock,
  toc: TocBlock,
};

function bodyFor(type) {
  if (TEXTISH_TYPES.includes(type)) return TextBlock;
  if (IMAGE_TYPES.includes(type)) return ImagesBlock;
  return BLOCK_BODIES[type];
}

// Text blocks switching to or from a list need their markup converted.
function changeType(x, type) {
  const isList = (t) => t === "bullets" || t === "numbered";
  if (isList(type) && !isList(x.type)) {
    x.html = "<li>" + String(x.html || "").replace(/<[^>]*>/g, "") + "</li>";
  } else if (!isList(type) && isList(x.type)) {
    x.html = String(x.html || "").replace(/<\/li>\s*<li>/g, " · ").replace(/<[^>]*>/g, "");
  }
  x.type = type;
}

// Carried into Copy HTML, which lays a two-column document out with CSS columns: the
// masthead spans both, furniture never splits, headings stay with what follows.
const KEEP_TOGETHER = ["quote", "image", "pair", "gallery", "stats", "table", "chart", "line", "poll", "timeline", "nutshell", "divider", "bullets", "numbered"];

function columnStyle(type, span) {
  if (span) return { columnSpan: "all" };
  if (SECTION_TYPES.includes(type)) return { breakInside: "avoid", breakAfter: "avoid" };
  return KEEP_TOGETHER.includes(type) ? { breakInside: "avoid" } : {};
}

function wrapStyle(selected, inLive, layout) {
  return {
    position: "relative",
    padding: "1px 0",
    ...layout,
    ...(selected && { outline: "1px solid rgba(176,141,74,0.55)", outlineOffset: 14 }),
    ...(inLive && { boxShadow: "inset 3px 0 0 rgba(201,162,39,0.45)", paddingLeft: 16, marginLeft: -16 }),
  };
}

function SelectionHandles() {
  return (
    <div data-chrome="" className="block-handles">
      <div className="block-handle block-handle--tl"></div>
      <div className="block-handle block-handle--tr"></div>
      <div className="block-handle block-handle--bl"></div>
      <div className="block-handle block-handle--br"></div>
    </div>
  );
}

function BlockToolbar({ block, allowed, isHeading, sectionSize, onPatch, onDeleteSection, onDuplicate }) {
  return (
    <div data-chrome="" className="block-toolbar" role="toolbar" aria-label="Block">
      {TEXTISH_TYPES.includes(block.type) && (
        <select className="block-type-select" aria-label="Block type" value={block.type} onChange={(e) => { const v = e.target.value; onPatch((x) => changeType(x, v)); }}>
          {TEXT_TYPE_OPTIONS.filter((o) => o.value === block.type || o.value === "h1" || o.value === "standfirst" || allowed.includes(o.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {isHeading && (
        <>
          <span className="block-section-label">{sectionSize > 1 ? "SECTION · " + sectionSize + " BLOCKS" : "SECTION"}</span>
          <button className="block-toolbar-btn" title="Delete this heading and everything under it" onClick={onDeleteSection}><span className="ms block-toolbar-icon" aria-hidden="true">delete_sweep</span>Delete section</button>
        </>
      )}
      <button className="block-toolbar-btn" title={"Duplicate (" + shortcutLabel("Ctrl+D") + ")"} onClick={onDuplicate}><span className="ms block-toolbar-icon" aria-hidden="true">content_copy</span>Duplicate</button>
    </div>
  );
}

export function BlockFrame({
  block,
  index,
  sectionSize,
  selected,
  inLive,
  building,
  allowed,
  theme,
  number,
  outline,
  slice,
  span,
  chromeSide = "left",
  readTime,
  onSelect,
  onPatch,
  onDelete,
  onDeleteSection,
  onDuplicate,
  onMoveStart,
  onDragEnd,
  onNotice,
}) {
  const isHeading = SECTION_TYPES.includes(block.type);
  const showChrome = block.type !== "h1" && block.type !== "standfirst";
  const Body = bodyFor(block.type);

  function stop(fn) {
    return (e) => { e.stopPropagation(); fn(); };
  }

  return (
    <div
      className="nt-blk"
      data-type={block.type}
      data-sel={selected ? "1" : "0"}
      data-rw={building ? "1" : undefined}
      data-drop-index={index}
      data-unit={block.id}
      style={wrapStyle(selected, inLive, columnStyle(block.type, span))}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id, index); }}
      onFocus={() => { if (!selected) onSelect(block.id, index); }}
    >
      {selected && <SelectionHandles />}

      {showChrome && (
        <div data-chrome="" className={`block-chrome${chromeSide === "right" ? " block-chrome--right" : ""}`}>
          <div
            className="block-chrome-btn block-chrome-btn--drag"
            draggable="true"
            title={(isHeading && sectionSize > 1 ? "Drag to move this whole section (" + sectionSize + " blocks)" : "Drag to reorder") + " · or select it and press " + shortcutLabel("Ctrl+Shift+↑/↓")}
            onDragStart={(e) => onMoveStart(e, block.id, isHeading && sectionSize > 1)}
            onDragEnd={onDragEnd}
          >
            <span className="ms block-chrome-icon" aria-hidden="true">{isHeading ? "swap_vert" : "drag_indicator"}</span>
          </div>
          <div className="block-chrome-btn" title="Delete" aria-label={"Delete " + blockLabel(block.type).toLowerCase()} onClick={stop(() => onDelete(block.id))} {...pressable(stop(() => onDelete(block.id)))}>
            <span className="ms block-chrome-icon--sm" aria-hidden="true">delete</span>
          </div>
        </div>
      )}

      {selected && (
        <BlockToolbar
          block={block}
          allowed={allowed}
          isHeading={isHeading}
          sectionSize={sectionSize}
          onPatch={onPatch}
          onDeleteSection={stop(() => onDeleteSection(block.id))}
          onDuplicate={stop(() => onDuplicate(block.id))}
        />
      )}

      {Body && <Body block={block} theme={theme} number={number} outline={outline} slice={slice} onPatch={onPatch} readTime={readTime} onDragEnd={onDragEnd} onNotice={onNotice} />}
    </div>
  );
}
