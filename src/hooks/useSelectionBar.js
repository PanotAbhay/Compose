import { useState, useEffect } from "react";
import { selectionNode } from "../utils/dom.js";

// Position of the inline format toolbar: above any non-empty selection inside an editable field
// of the article. The document title is plain text, so it gets no toolbar.
export function useSelectionBar() {
  const [bar, setBar] = useState(null);

  useEffect(() => {
    function handleSelectionChange() {
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) { setBar(null); return; }
      const n = selectionNode(s);
      if (!n || !n.closest || !n.closest('[data-article] [contenteditable="true"]')) { setBar(null); return; }
      const r = s.getRangeAt(0).getBoundingClientRect();
      if (!r.width) return;
      const x = Math.round(r.left + r.width / 2);
      const y = Math.round(r.top - 8);
      // selectionchange fires on every caret move; skip the re-render when the bar hasn't moved.
      setBar((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  return [bar, setBar];
}
