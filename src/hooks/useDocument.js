import { useRef } from "react";
import { cloneBlock, withId } from "../utils/blocks.js";

const UNDO_LIMIT = 80;

// Editing operations on the active tab's blocks. Undo history is kept per tab.
export function useDocument({ doc, updateDoc, flash }) {
  // Async AI calls and blur handlers need the latest blocks, not the ones from their render.
  const blocksRef = useRef(doc ? doc.blocks : []);
  const docIdRef = useRef(doc ? doc.id : null);
  const historyRef = useRef({});

  // Switching tabs points the editor at the other tab's blocks.
  if ((doc ? doc.id : null) !== docIdRef.current) {
    docIdRef.current = doc ? doc.id : null;
    blocksRef.current = doc ? doc.blocks : [];
  }

  function history() {
    const id = docIdRef.current;
    if (!historyRef.current[id]) historyRef.current[id] = { undo: [], redo: [] };
    return historyRef.current[id];
  }

  function getBlocks() {
    return blocksRef.current;
  }

  function write(next) {
    blocksRef.current = next;
    updateDoc(docIdRef.current, { blocks: next });
  }

  function save(next) {
    // Snapshot the outgoing blocks so Ctrl+Z can bring them back.
    const h = history();
    h.undo.push(blocksRef.current);
    if (h.undo.length > UNDO_LIMIT) h.undo.shift();
    h.redo = [];
    write(next);
  }

  function step(back, emptyMsg, doneMsg) {
    // Blur first: committing a focused field saves its edit, which this step then reverts.
    // Reading the history afterwards keeps the redo stack that save() just replaced.
    document.activeElement?.blur?.();
    const h = history();
    const from = back ? h.undo : h.redo;
    const to = back ? h.redo : h.undo;
    if (!from.length) {
      flash(emptyMsg);
      return false;
    }
    to.push(blocksRef.current);
    write(from.pop());
    flash(doneMsg);
    return true;
  }

  function undo() {
    return step(true, "NOTHING TO UNDO", "UNDONE");
  }

  function redo() {
    return step(false, "NOTHING TO REDO", "REDONE");
  }

  // An edit that changes nothing (a field focused and left) adds no undo step and keeps redo.
  function patch(id, fn) {
    let changed = false;
    const next = blocksRef.current.map((b) => {
      if (b.id !== id) return b;
      const copy = cloneBlock(b);
      fn(copy);
      if (JSON.stringify(copy) === JSON.stringify(b)) return b;
      changed = true;
      return copy;
    });
    if (changed) save(next);
  }

  function insertAt(index, block) {
    const created = withId(block);
    const next = blocksRef.current.slice();
    next.splice(index, 0, created);
    save(next);
    return created.id;
  }

  function forget(id) {
    delete historyRef.current[id];
  }

  return { blocks: doc ? doc.blocks : [], getBlocks, save, patch, insertAt, undo, redo, forget };
}
