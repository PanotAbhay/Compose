import { IMAGE_TYPES } from "../data/index.js";

const MAX_SIDE = 2000;
export const DEFAULT_FRAME = { x: 50, y: 50, zoom: 1 };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// The part of the photo the editor shows in a W×H slot: object-fit cover, object-position x% y%,
// then scale(zoom) around that same point. Returns the source rectangle in image pixels.
function visibleRect(img, w, h, frame) {
  const { x, y, zoom } = { ...DEFAULT_FRAME, ...frame };
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const offX = (w - img.naturalWidth * s) * (x / 100);
  const offY = (h - img.naturalHeight * s) * (y / 100);
  const ox = w * (x / 100);
  const oy = h * (y / 100);
  const left = ox - ox / zoom;
  const top = oy - oy / zoom;
  return {
    sx: (left - offX) / s,
    sy: (top - offY) / s,
    sw: w / zoom / s,
    sh: h / zoom / s,
  };
}

async function cropToSlot(src, w, h, frame) {
  const img = await loadImage(src);
  const r = visibleRect(img, w, h, frame);
  const scale = Math.min(1, MAX_SIDE / Math.max(r.sw, r.sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(r.sw * scale));
  canvas.height = Math.max(1, Math.round(r.sh * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

// Every photo exactly as framed on the page, keyed by block id: { [id]: [dataUrl | null, …] }.
// Reads each slot's on-screen proportions so exported figures keep the editor's shape.
export async function framedImages(blocks) {
  const out = {};
  for (const b of blocks) {
    if (!IMAGE_TYPES.includes(b.type)) continue;
    const els = document.querySelectorAll('[data-unit="' + b.id + '"] .image-slot');
    out[b.id] = await Promise.all((b.slots || []).map(async (src, i) => {
      const el = els[i];
      if (!src || !el || !el.offsetWidth) return null;
      try {
        return await cropToSlot(src, el.offsetWidth, el.offsetHeight, b.frames && b.frames[i]);
      } catch {
        return null;
      }
    }));
  }
  return out;
}
