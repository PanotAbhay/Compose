import { useState, useRef } from "react";
import { NEW_BLOCK, AI_FILL_TYPES } from "../data/index.js";
import { moveBlock, moveSection } from "../utils/blocks.js";
import { selectedProseIds } from "../utils/dom.js";

// Drag state for palette items and block handles, plus the drop indicator position.
export function useBlockDrag({ getBlocks, save, insertBlock, onFill, flash }) {
  const [drop, setDrop] = useState({ index: -1, line: null });
  const dragRef = useRef(null);

  function startDrag(e, payload, data, effect) {
    dragRef.current = payload;
    try {
      e.dataTransfer.setData("text/plain", data);
      e.dataTransfer.effectAllowed = effect;
    } catch { /* some browsers refuse dataTransfer writes */ }
  }

  function startNewDrag(e, type) {
    // Remember any paragraphs the editor had selected; they become the AI's source text.
    startDrag(e, { kind: "new", type, selectedIds: selectedProseIds() }, type, "copy");
  }

  function startMoveDrag(e, id, run) {
    startDrag(e, { kind: "move", id, run }, id, "move");
  }

  // `line` is where to draw the insertion line on the canvas (see dropBoundary in Canvas).
  function showDrop(index, line) {
    const same = drop.index === index && drop.line && line && drop.line.top === line.top && drop.line.left === line.left;
    if (!same) setDrop({ index, line });
  }

  function clearDrop() {
    dragRef.current = null;
    setDrop({ index: -1, line: null });
  }

  // `prose` is set when dropping beside paragraphs: { groupIds, adjacentId }.
  function dropAt(index, prose) {
    const d = dragRef.current;
    clearDrop();
    if (!d) return;
    if (d.kind === "move") {
      const cur = getBlocks();
      const next = d.run ? moveSection(cur, d.id, index) : moveBlock(cur, d.id, index);
      if (!next) {
        if (d.run) flash("A SECTION CAN’T MOVE INSIDE ITSELF", true);
        return;
      }
      // Dropped back where it was: nothing to save, so no empty undo step.
      if (next.some((b, i) => b !== cur[i])) save(next);
      return;
    }
    const id = insertBlock(index, NEW_BLOCK[d.type]());
    if (!prose || !AI_FILL_TYPES.includes(d.type)) return;
    const selected = d.selectedIds.filter((s) => prose.groupIds.includes(s));
    onFill(id, d.type, selected.length ? selected : [prose.adjacentId]);
  }

  return { drop, startNewDrag, startMoveDrag, showDrop, clearDrop, dropAt };
}
