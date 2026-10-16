// Safari's engine (WebKit without Chromium) draws the caret a few letters off beside a floated
// ::first-letter drop cap, so Backspace seems to delete the wrong letters. Chrome is fine.
export const WEBKIT_DROP_CAP_BUG = typeof navigator !== "undefined"
  && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR/.test(navigator.userAgent);

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// A shortcut as the platform writes it: "Ctrl+Shift+Z" on Windows and Linux, "⌘⇧Z" on a Mac.
export function shortcutLabel(combo) {
  return IS_MAC ? combo.replace(/Ctrl\+/g, "⌘").replace(/Shift\+/g, "⇧").replace(/Alt\+/g, "⌥") : combo;
}

// Keyboard access for a clickable element that isn't a <button> (swapping in a button would change
// its look): it takes focus, and Enter or Space activates it.
export function pressable(onActivate) {
  return {
    role: "button",
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onActivate(e);
    },
  };
}

// Text fields where typing keys (and Ctrl+Z) belong to the browser, not to the editor's shortcuts.
export function isTextField(node) {
  if (!node || !node.tagName) return false;
  if (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "SELECT") return true;
  return !!(node.isContentEditable || (node.closest && node.closest('[contenteditable="true"]')));
}

// Link the selected text. The prompt starts with the current link, an empty answer removes it,
// and a bare "example.com" becomes https://example.com rather than a broken relative link.
export function promptLink() {
  const node = selectionNode(window.getSelection());
  const current = node && node.closest ? node.closest("a") : null;
  const answer = window.prompt("Link URL — leave empty to remove the link", current ? current.getAttribute("href") || "" : "https://");
  if (answer == null) return;
  const url = answer.trim();
  if (!url || url === "https://") {
    if (current) document.execCommand("unlink");
    return;
  }
  document.execCommand("createLink", false, /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(url) ? url : "https://" + url);
}

// Write a value into a contentEditable node without stealing the caret.
export function bindContent(node, value, asHtml) {
  if (!node) return;
  if (document.activeElement === node) return;
  const v = value == null ? "" : String(value);
  if (asHtml) {
    if (node.innerHTML !== v) node.innerHTML = v;
    node.__ntLast = node.innerHTML;
  } else if (node.innerText !== v) {
    node.innerText = v;
  }
}

function selectionNode(selection) {
  let node = selection && selection.anchorNode;
  if (node && node.nodeType === 3) node = node.parentElement;
  return node;
}

// Block ids of the prose paragraphs a non-empty selection touches.
export function selectedProseIds() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return [];
  const node = selectionNode(selection);
  const wrap = node && node.closest ? node.closest("[data-prose]") : null;
  if (!wrap) return [];
  const all = JSON.parse(wrap.getAttribute("data-ids") || "[]");
  const range = selection.getRangeAt(0);
  return Array.from(wrap.children)
    .map((p, i) => (range.intersectsNode(p) ? all[i] : null))
    .filter(Boolean);
}

export function caretParagraphIndex(wrap) {
  const node = selectionNode(window.getSelection());
  const p = node && node.closest ? node.closest("p") : null;
  const kids = Array.from(wrap.children);
  const k = p ? kids.indexOf(p) : kids.length - 1;
  return k < 0 ? kids.length : k;
}
