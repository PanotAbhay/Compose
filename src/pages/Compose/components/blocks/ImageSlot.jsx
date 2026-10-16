import { useState, useRef, useEffect } from "react";
import { pressable } from "../../../../utils/dom.js";
import "./ImageSlot.css";

export const DEFAULT_FRAME = { x: 50, y: 50, zoom: 1 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// The photo fills the slot (cover); x/y pick the focal point and zoom scales around it. Inline
// so Copy HTML and Preview keep the crop.
function imageStyle(frame) {
  const at = frame.x + "% " + frame.y + "%";
  return {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: at,
    transform: "scale(" + frame.zoom + ")",
    transformOrigin: at,
    userSelect: "none",
    pointerEvents: "none",
  };
}

// One photo slot: click or drop to add a photo, drag to pan it, zoom from the toolbar or with
// pinch / ⌘-scroll. A whole drag or zoom gesture saves once (one undo step).
export function ImageSlot({ src, frame, height, aspect, emptyStyle, children, onPick, onDropFile, onFrame }) {
  const saved = { ...DEFAULT_FRAME, ...frame };
  const [live, setLive] = useState(null);
  const shown = live || saved;
  const slotRef = useRef(null);
  const dragRef = useRef(null);
  const wheelTimer = useRef(null);
  // Latest values for handlers that outlive a render (pointer drags, the wheel listener).
  const latest = useRef({});
  latest.current = { saved, live, onFrame };

  function commit(next) {
    const { saved: base, onFrame: save } = latest.current;
    setLive(null);
    if (next.x !== base.x || next.y !== base.y || next.zoom !== base.zoom) save(next);
  }

  function preview(next) {
    latest.current.live = next;
    setLive(next);
  }

  function zoomTo(zoom) {
    return { ...shown, zoom: Math.round(clamp(zoom, MIN_ZOOM, MAX_ZOOM) * 100) / 100 };
  }

  // Pinch on a trackpad (or ⌘/Ctrl + scroll) zooms; plain scrolling still scrolls the page.
  useEffect(() => {
    const el = slotRef.current;
    if (!el || !src) return undefined;
    function handleWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const base = latest.current.live || latest.current.saved;
      const next = { ...base, zoom: Math.round(clamp(base.zoom * (1 - e.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM) * 100) / 100 };
      preview(next);
      // Save once the gesture pauses.
      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => commit(latest.current.live || next), 350);
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [src]);

  useEffect(() => () => clearTimeout(wheelTimer.current), []);

  function handlePointerDown(e) {
    if (!src || e.button !== 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { x: e.clientX, y: e.clientY, rect, from: shown, moved: false, last: null };
  }

  function handlePointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
    // Moving the pointer right reveals more of the left side, like dragging a photo in a frame.
    d.last = {
      ...d.from,
      x: Math.round(clamp(d.from.x - (dx / d.rect.width) * 100 / d.from.zoom, 0, 100) * 10) / 10,
      y: Math.round(clamp(d.from.y - (dy / d.rect.height) * 100 / d.from.zoom, 0, 100) * 10) / 10,
    };
    preview(d.last);
  }

  function handlePointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.moved && d.last) commit(d.last);
    else setLive(null);
  }

  function hasFiles(e) {
    return Array.from(e.dataTransfer.types || []).includes("Files");
  }

  return (
    <div
      ref={slotRef}
      className={`image-slot${src ? " image-slot--filled" : ""}`}
      title={src ? "Drag to reposition · pinch or ⌘/Ctrl + scroll to zoom" : "Click or drop a photo"}
      style={{
        position: "relative",
        overflow: "hidden",
        // A fixed proportion (height ÷ width) when the template prints photos at set shapes.
        ...(aspect ? { aspectRatio: String(1 / aspect) } : { height }),
        background: "var(--placeholder)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: src ? (live ? "grabbing" : "grab") : "pointer",
        border: "1px dashed " + (src ? "transparent" : "var(--rule)"),
        ...(!src && emptyStyle),
      }}
      onClick={(e) => { if (!src) { e.stopPropagation(); onPick(); } }}
      {...(!src && pressable((e) => { e.stopPropagation(); onPick(); }))}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); } }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        onDropFile(e.dataTransfer.files && e.dataTransfer.files[0]);
      }}
    >
      {src ? <img src={src} alt="" draggable={false} style={imageStyle(shown)} /> : children}

      {src && (
        <div
          data-chrome=""
          className="image-slot-tools"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="image-slot-btn" title="Zoom out" aria-label="Zoom out" onClick={() => commit(zoomTo(shown.zoom - 0.25))}>
            <span className="ms image-slot-icon" aria-hidden="true">remove</span>
          </button>
          <input
            className="image-slot-range"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={shown.zoom}
            title="Zoom"
            aria-label="Photo zoom"
            onChange={(e) => preview(zoomTo(Number(e.target.value)))}
            onPointerUp={() => latest.current.live && commit(latest.current.live)}
            onKeyUp={() => latest.current.live && commit(latest.current.live)}
          />
          <button className="image-slot-btn" title="Zoom in" aria-label="Zoom in" onClick={() => commit(zoomTo(shown.zoom + 0.25))}>
            <span className="ms image-slot-icon" aria-hidden="true">add</span>
          </button>
          <span className="image-slot-sep"></span>
          <button className="image-slot-btn" title="Reset framing" aria-label="Reset framing" onClick={() => commit({ ...DEFAULT_FRAME })}>
            <span className="ms image-slot-icon" aria-hidden="true">fit_screen</span>
          </button>
          <button className="image-slot-btn" title="Replace photo" aria-label="Replace photo" onClick={onPick}>
            <span className="ms image-slot-icon" aria-hidden="true">image</span>
          </button>
        </div>
      )}
    </div>
  );
}
