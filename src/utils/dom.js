// Safari's engine (WebKit without Chromium) draws the caret a few letters off beside a floated
// ::first-letter drop cap, so Backspace seems to delete the wrong letters. Chrome is fine.
export const WEBKIT_DROP_CAP_BUG = typeof navigator !== "undefined"
  && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR/.test(navigator.userAgent);

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

export function selectionNode(selection) {
  let node = selection && selection.anchorNode;
  if (node && node.nodeType === 3) node = node.parentElement;
  return node;
}

export function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
