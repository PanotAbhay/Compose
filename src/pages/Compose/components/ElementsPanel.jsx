import { useState } from "react";
import { PALETTE_GROUPS, AI_FILL_TYPES } from "../../../data/index.js";
import "./ElementsPanel.css";

const HINT_SUFFIX = " — click to insert at the cursor, or drag it in";
const AI_HINT_SUFFIX = " — drop it beside a paragraph to build it from that text";

function hintFor(item) {
  return item.hint + (AI_FILL_TYPES.includes(item.type) ? AI_HINT_SUFFIX : HINT_SUFFIX);
}

// Matches the name and description, not the how-to suffix ("click", "paragraph" would match everything).
function filterGroups(query, allowed) {
  const q = query.trim().toLowerCase();
  return PALETTE_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => allowed.includes(i.type) && (!q || (i.label + " " + i.hint).toLowerCase().includes(q))),
    }))
    .filter((g) => g.items.length);
}

export function ElementsPanel({ open, allowed, onInsert, onDragStart, onDragEnd }) {
  const [query, setQuery] = useState("");
  const groups = filterGroups(query, allowed);

  // The keyboard way in: type to filter, Enter adds the first match at the cursor.
  function handleSearchKey(e) {
    if (e.key === "Enter" && groups.length) {
      e.preventDefault();
      onInsert(groups[0].items[0]);
    } else if (e.key === "Escape" && query) {
      e.stopPropagation();
      setQuery("");
    }
  }

  return (
    <aside className={`elements-panel${open ? "" : " elements-panel--closed"}`} aria-label="Elements" inert={open ? undefined : ""}>
      <div className="elements-panel-inner">
        <div className="elements-panel-head">
          <div className="elements-panel-title">Elements</div>
          <div className="elements-panel-search">
            <span className="ms elements-panel-search-icon" aria-hidden="true">search</span>
            <input
              className="elements-panel-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              spellCheck={false}
              aria-label="Search elements. Press Enter to add the first match at the cursor"
              placeholder="Search elements"
            />
          </div>
        </div>
        <div className="elements-panel-list">
          {query.trim() && !groups.length && (
            <div className="elements-group">
              <div className="elements-group-label" role="status">{"NO ELEMENTS MATCH “" + query.trim().toUpperCase() + "”"}</div>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.key} className="elements-group">
              <div className="elements-group-label">{g.label}</div>
              <div className="elements-group-items">
                {g.items.map((item) => (
                  <div
                    key={item.type}
                    className="elements-item"
                    draggable="true"
                    title={hintFor(item)}
                    onDragStart={(e) => onDragStart(e, item.type)}
                    onDragEnd={onDragEnd}
                    onClick={() => onInsert(item)}
                  >
                    <span className="ms elements-item-icon" aria-hidden="true">{item.icon}</span>
                    <span className="elements-item-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
