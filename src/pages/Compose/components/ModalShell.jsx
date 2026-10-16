import { useDialog } from "../../../hooks/useDialog.js";
import "./ModalShell.css";

// `docked` pins the card to the right edge over a clear, click-through overlay,
// for settings whose effect should stay visible on the page behind. A docked card isn't modal:
// focus isn't trapped in it, so the page stays usable.
export function ModalShell({ variant, docked, label, onClose, children }) {
  const ref = useDialog({ onClose, trap: !docked });
  const dock = docked ? " modal-overlay--docked" : "";
  return (
    <div className={`modal-overlay modal-overlay--${variant}${dock}`}>
      <div
        ref={ref}
        className={`modal-card modal-card--${variant}`}
        role="dialog"
        aria-modal={docked ? undefined : "true"}
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
