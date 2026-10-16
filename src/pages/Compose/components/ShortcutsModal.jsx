import { shortcutLabel } from "../../../utils/dom.js";
import { ModalShell } from "./ModalShell.jsx";
import "./ShortcutsModal.css";

const SHORTCUT_GROUPS = [
  {
    label: "GENERAL",
    items: [
      ["Ctrl+Z", "Undo"],
      ["Ctrl+Shift+Z  ·  Ctrl+Y", "Redo"],
      ["?  ·  Ctrl+/", "Show these shortcuts"],
      ["Esc", "Close a dialog or menu"],
    ],
  },
  {
    label: "BLOCKS",
    items: [
      ["Esc", "Stop typing and select the block"],
      ["↑  ↓", "Select the block above or below"],
      ["Enter", "Edit the selected block"],
      ["Ctrl+Shift+↑  ↓", "Move the selected block (a heading takes its section)"],
      ["Ctrl+D", "Duplicate the selected block"],
      ["Delete", "Delete the selected block"],
    ],
  },
  {
    label: "TEXT",
    items: [
      ["Ctrl+B", "Bold"],
      ["Ctrl+I", "Italic"],
      ["Ctrl+K", "Link the selected text"],
      ["Enter in the title", "Rename the document (Esc cancels)"],
    ],
  },
  {
    label: "ELEMENTS AND TABS",
    items: [
      ["Enter in Search", "Add the first match at the cursor"],
      ["←  →", "Switch between document tabs"],
      ["Delete on a tab", "Close that document (UNDO brings it back)"],
    ],
  },
];

export function ShortcutsModal({ onClose }) {
  return (
    <ModalShell variant="shortcuts" label="Keyboard shortcuts" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-kicker">KEYBOARD SHORTCUTS</div>
        <div className="modal-desc">Select a block by clicking beside its text, or press Esc while typing in it.</div>
      </div>
      <div className="shortcuts-body">
        {SHORTCUT_GROUPS.map((g) => (
          <div key={g.label} className="shortcuts-group">
            <div className="modal-label">{g.label}</div>
            <dl className="shortcuts-list">
              {g.items.map(([keys, action]) => (
                <div key={g.label + keys} className="shortcuts-row">
                  <dt className="shortcuts-keys">{shortcutLabel(keys)}</dt>
                  <dd className="shortcuts-action">{action}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <button className="modal-btn modal-btn--primary" onClick={onClose}>Done</button>
      </div>
    </ModalShell>
  );
}
