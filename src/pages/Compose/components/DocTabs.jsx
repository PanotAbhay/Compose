import { useEffect, useRef } from "react";
import { TEMPLATES } from "../../../data/index.js";
import "./DocTabs.css";

export function DocTabs({ docs, activeId, onSelect, onClose, onNew }) {
  const ref = useRef(null);

  // A new tab is added at the end of a strip that scrolls sideways; bring the active one into view.
  useEffect(() => {
    const tab = ref.current && ref.current.querySelector('[aria-selected="true"]');
    if (tab && tab.scrollIntoView) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, docs.length]);

  // Arrow keys move between tabs (the WAI-ARIA tabs pattern); Delete closes the focused one.
  function handleKeyDown(e, d, i) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(d.id);
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = docs[(i + (e.key === "ArrowRight" ? 1 : -1) + docs.length) % docs.length];
      onSelect(next.id);
      const tabs = ref.current.querySelectorAll('[role="tab"]');
      const at = docs.indexOf(next);
      if (tabs[at]) tabs[at].focus();
    } else if (e.key === "Delete") {
      e.preventDefault();
      onClose(d);
    }
  }

  return (
    <div className="doc-tabs" ref={ref} role="tablist" aria-label="Open documents">
      {docs.map((d, i) => (
        <div
          key={d.id}
          className={`doc-tab${d.id === activeId ? " doc-tab--active" : ""}`}
          role="tab"
          aria-selected={d.id === activeId}
          tabIndex={d.id === activeId ? 0 : -1}
          title={d.title + " · " + TEMPLATES[d.templateKey].label + " template"}
          onClick={() => onSelect(d.id)}
          onKeyDown={(e) => handleKeyDown(e, d, i)}
        >
          <span className="ms doc-tab-icon" aria-hidden="true">{TEMPLATES[d.templateKey].icon}</span>
          <span className="doc-tab-title">{d.title}</span>
          <button
            className="doc-tab-close"
            title="Close this document"
            aria-label={"Close " + d.title}
            tabIndex={d.id === activeId ? 0 : -1}
            onClick={(e) => { e.stopPropagation(); onClose(d); }}
          >
            <span className="ms doc-tab-close-icon" aria-hidden="true">close</span>
          </button>
        </div>
      ))}
      <button className="doc-tabs-new" title="New document from a template" aria-label="New document from a template" onClick={onNew}>
        <span className="ms doc-tabs-new-icon" aria-hidden="true">add</span>
      </button>
    </div>
  );
}
