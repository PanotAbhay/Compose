import { useEffect, useRef } from "react";
import { isTextField, promptLink } from "../utils/dom.js";

// Controls that already answer Enter, Space and arrow keys themselves.
const KEY_OWNERS = 'button, a[href], select, [role="button"], [role="tab"], [role="menuitem"]';

function isFormField(node) {
  return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "SELECT");
}

// Editor-wide keys. Block commands act on the selected block, and only while focus is on the
// page itself, never inside a text field or on a control that has its own keys.
export function useShortcuts(handlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function handleKeyDown(e) {
      const h = handlersRef.current;
      const target = e.target && e.target.nodeType === 1 ? e.target : document.body;
      // Dialogs answer their own keys (useDialog).
      if (target.closest('[role="dialog"]')) return;
      const typing = isTextField(target);
      const mod = e.metaKey || e.ctrlKey;
      const k = String(e.key || "").toLowerCase();

      if (e.key === "Escape") {
        if (typing && !isFormField(target) && h.onLeaveText) h.onLeaveText(target);
        else h.onEscape();
        return;
      }

      if (mod && !e.altKey && (k === "z" || k === "y")) {
        // Inputs and textareas keep the browser's own undo for their typing.
        if (isFormField(target)) return;
        e.preventDefault();
        const redo = (k === "z" && e.shiftKey) || k === "y";
        // Inside a text field, let the browser undo or redo the typing first.
        const ae = document.activeElement;
        if (ae && isTextField(ae)) {
          const before = ae.innerHTML;
          document.execCommand(redo ? "redo" : "undo");
          if (ae.innerHTML !== before) return;
        }
        if (redo) h.onRedo();
        else h.onUndo();
        return;
      }

      if (mod && k === "k" && typing && !isFormField(target) && target.closest("[data-article]")) {
        const s = window.getSelection();
        if (s && !s.isCollapsed) {
          e.preventDefault();
          promptLink();
        }
        return;
      }

      if ((mod && e.key === "/") || (e.key === "?" && !typing && !mod)) {
        e.preventDefault();
        if (h.onShortcuts) h.onShortcuts();
        return;
      }

      if (!h.selected || typing || e.defaultPrevented || target.closest(KEY_OWNERS)) return;

      if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        h.onMoveBlock(e.key === "ArrowUp" ? -1 : 1);
      } else if (mod && !e.shiftKey && k === "d") {
        e.preventDefault();
        h.onDuplicateBlock();
      } else if (mod || e.altKey) {
        return;
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        h.onSelectSibling(e.key === "ArrowUp" ? -1 : 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        h.onEditBlock();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        h.onDeleteBlock();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
