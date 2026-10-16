import { useState } from "react";
import { STORAGE_KEYS } from "../data/index.js";
import { readStorage, writeStorage } from "../utils/storage.js";

export function useZoom(initial = 0.75) {
  const [zoom, setZoom] = useState(() => parseFloat(readStorage(STORAGE_KEYS.zoom)) || initial);

  function setTo(value) {
    const z = Math.min(1.5, Math.max(0.5, Math.round(value * 100) / 100));
    setZoom(z);
    writeStorage(STORAGE_KEYS.zoom, String(z));
  }

  return {
    zoom,
    defaultZoom: initial,
    zoomIn: () => setTo(zoom + 0.05),
    zoomOut: () => setTo(zoom - 0.05),
    zoomReset: () => setTo(initial),
  };
}
