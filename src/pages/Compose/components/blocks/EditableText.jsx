import { bindContent } from "../../../../utils/dom.js";

// The DOM owns the text while editing; React only writes it back when the field isn't focused.
export function EditableText({ as: Tag = "div", value, html = false, onCommit, ...props }) {
  // Every commit is an undo step and an autosave, so a blur that changed nothing skips it.
  function handleBlur(e) {
    const next = html ? e.target.innerHTML : e.target.innerText;
    if (next !== String(value == null ? "" : value)) onCommit(next);
  }

  return <Tag {...props} contentEditable ref={(node) => bindContent(node, value, html)} onBlur={handleBlur} />;
}
