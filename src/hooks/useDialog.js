import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "button:not([disabled])", "[href]", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(", ");

// The WAI-ARIA modal dialog pattern. On open, focus moves into the dialog: onto its
// [data-autofocus] field, or the dialog itself, so no button lights up a focus ring. Escape calls
// onClose. With `trap`, Tab cycles inside the dialog. On close, focus goes back to the opener.
export function useDialog({ onClose, trap = true }) {
  const ref = useRef(null);
  const latest = useRef({ onClose, trap });

  useEffect(() => {
    latest.current = { onClose, trap };
  });

  useEffect(() => {
    const node = ref.current;
    const opener = document.activeElement;
    if (node && !node.contains(document.activeElement)) {
      (node.querySelector("[data-autofocus]") || node).focus();
    }

    function handleKeyDown(e) {
      if (!node) return;
      const { onClose: close, trap: trapping } = latest.current;
      // A docked dialog leaves the page usable, so it only answers keys pressed inside it.
      if (!trapping && !node.contains(e.target)) return;
      if (e.key === "Escape" && close) {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !trapping) return;
      const items = Array.from(node.querySelectorAll(FOCUSABLE));
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === node || !node.contains(at))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !node.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (opener && opener.focus && opener !== document.body && document.contains(opener)) opener.focus();
    };
  }, []);

  return ref;
}
