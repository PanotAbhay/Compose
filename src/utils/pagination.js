// A4 at 96 dpi, with ~19 mm margins. Values are CSS px before the editor's zoom.
export const A4 = { width: 794, height: 1123, margin: 72 };

// Spare room so measuring error (collapsed margins, a line added mid-edit) never pushes text off the page.
const SAFETY = 16;
const MIN_LINES = 2; // widow / orphan control
const LEDE_LINES = 3; // a drop cap needs its first lines together

// Fill columns top to bottom, then the next column, then the next page, the way a typesetter
// would: paragraphs split at a line break (keeping 2+ lines on each side), other blocks never
// split, and a heading moves on unless the start of what follows fits under it. A figure that
// doesn't fit floats like in LaTeX: what follows fills the rest of the column, and the figure
// opens the next one. The masthead sits across the top of page 1. A chapter opens a new page,
// after any figures still waiting (like \clearpage).
//
// units: [{ id, height, keepWithNext, float?, pageBreak?, lineHeight?, textHeight?, top?, lede? }] —
// lineHeight marks a block that splits at a line break (a paragraph, or a code listing / contents
// whose lines start `top` px down, below their caption or title).
// Returns pages: [{ masthead: [id], columns: [[item]] }], item = { id, show?, skip? }:
// `show` = visible px from the top (the paragraph continues elsewhere), `skip` = px already shown.
// `scale` is the content zoom inside the page (heights are measured in unzoomed px);
// `margin` the page margin when a template sets its own.
export function planPages(units, { columns, mastheadCount, scale = 1, margin = A4.margin }) {
  const masthead = units.slice(0, mastheadCount);
  const mastheadHeight = masthead.reduce((n, u) => n + u.height, 0);
  const body = (A4.height - margin * 2) / scale;
  const firstPageRoom = body - mastheadHeight - SAFETY;
  const pageRoom = body - SAFETY;
  const pages = [];
  let page = null;
  let col = 0;
  let room = 0;

  function newPage(capacity) {
    page = { masthead: [], columns: Array.from({ length: columns }, () => []) };
    pages.push(page);
    col = 0;
    room = capacity;
  }

  function nextColumn() {
    if (col + 1 < columns) {
      col += 1;
      room = pages.length === 1 ? firstPageRoom : pageRoom;
    } else {
      newPage(pageRoom);
    }
  }

  const columnEmpty = () => page.columns[col].length === 0;
  const pageEmpty = () => page.masthead.length === 0 && page.columns.every((c) => c.length === 0);
  const pending = [];

  // Deferred figures open the next column, before anything else goes in it.
  function flush() {
    while (pending.length) {
      const f = pending[0];
      if (f.height > room && !columnEmpty()) { nextColumn(); continue; }
      pending.shift();
      place({ id: f.id }, f.height);
    }
  }

  function advance() {
    nextColumn();
    flush();
  }

  function place(item, height) {
    page.columns[col].push(item);
    room -= height;
  }

  // Lines of a paragraph that can go in the current column, honouring widow/orphan control.
  function linesThatFit(u, remaining, skip) {
    const top = skip ? 0 : u.top || 0;
    const below = u.height - u.textHeight - (u.top || 0);
    const totalLines = Math.round((remaining - below - top) / u.lineHeight);
    const minFirst = u.lede && !skip ? LEDE_LINES : MIN_LINES;
    const fit = Math.floor((room - top) / u.lineHeight);
    if (fit < minFirst || totalLines - fit < MIN_LINES) {
      const capped = totalLines - MIN_LINES;
      return capped >= minFirst && capped <= fit ? capped : 0;
    }
    return fit;
  }

  function placeParagraph(u) {
    let skip = 0;
    let remaining = u.height;
    for (;;) {
      if (remaining <= room) {
        place(skip ? { id: u.id, skip } : { id: u.id }, remaining);
        return;
      }
      const lines = linesThatFit(u, remaining, skip);
      if (lines > 0) {
        const show = (skip ? 0 : u.top || 0) + lines * u.lineHeight;
        place(skip ? { id: u.id, skip, show } : { id: u.id, show }, room);
        skip += show;
        remaining -= show;
        advance();
        continue;
      }
      if (columnEmpty()) {
        // Too long even for an empty column and unsplittable here: let it run on.
        place(skip ? { id: u.id, skip } : { id: u.id }, remaining);
        return;
      }
      advance();
    }
  }

  newPage(firstPageRoom);
  page.masthead = masthead.map((u) => u.id);

  const rest = units.slice(mastheadCount);
  rest.forEach((u, i) => {
    const next = rest[i + 1];
    if (u.pageBreak) {
      if (pending.length) advance();
      if (!pageEmpty()) newPage(pageRoom);
    }
    if (u.lineHeight) { placeParagraph(u); return; }

    if (u.float && u.height > room && !columnEmpty() && next) {
      pending.push(u);
      return;
    }

    // A heading needs the start of the next block (3 lines of a paragraph, or all of anything else) under it.
    const follow = u.keepWithNext && next ? (next.lineHeight ? Math.min(next.height, (next.top || 0) + LEDE_LINES * next.lineHeight) : next.height) : 0;
    const need = u.height + follow <= pageRoom ? u.height + follow : u.height;
    if (need > room && !columnEmpty()) advance();
    place({ id: u.id }, u.height);
  });
  if (pending.length) advance();

  return pages;
}
