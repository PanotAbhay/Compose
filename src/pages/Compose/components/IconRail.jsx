import { pressable, shortcutLabel } from "../../../utils/dom.js";
import "./IconRail.css";

function RailButton({ icon, title, active, muted, expanded, onClick }) {
  const modifier = active ? " rail-btn--active" : (muted ? " rail-btn--muted" : "");
  return (
    <div className={`rail-btn${modifier}`} title={title} aria-label={title} aria-expanded={expanded} onClick={onClick} {...pressable(onClick)}>
      <span className="ms rail-btn-icon" aria-hidden="true">{icon}</span>
    </div>
  );
}

export function IconRail({ panelOpen, onTogglePanel, onTemplates, onImport, onUndo, onRedo, onExport, onSettings, onReset }) {
  return (
    <nav className="rail" aria-label="Editor tools">
      <RailButton icon="add" title={panelOpen ? "Hide elements" : "Show elements"} active={panelOpen} expanded={panelOpen} onClick={onTogglePanel} />
      <RailButton icon="dashboard_customize" title="New document from a template" onClick={onTemplates} />
      <RailButton icon="description" title="Import an article" onClick={onImport} />
      <RailButton icon="undo" title={"Undo (" + shortcutLabel("Ctrl+Z") + ")"} onClick={onUndo} />
      <RailButton icon="redo" title={"Redo (" + shortcutLabel("Ctrl+Shift+Z") + ")"} onClick={onRedo} />
      <RailButton icon="code_blocks" title="Copy HTML" onClick={onExport} />
      <div className="rail-spacer"></div>
      <RailButton icon="settings" title="Settings: AI model and fonts" muted onClick={onSettings} />
      <RailButton icon="restart_alt" title="Reset to the template’s starter page" muted onClick={onReset} />
      <div className="rail-avatar" aria-hidden="true">RN</div>
    </nav>
  );
}
