# CLAUDE.md

QMUL AI Hackathon team repo. The product is **Compose**, a standalone prototype of a visual feature builder: import an article, have AI structure it, then edit it on the page. See README.md for the user-facing overview and file layout.

## Commands

```
npm install
npm run dev      # Vite dev server
npm run build    # must pass before committing
npm test         # Vitest, every test file in parallel; must pass before committing
```

Tests sit next to the code they cover (`*.test.js` / `*.test.jsx`) and run in jsdom (setup in `src/test/setup.js`); the PDF reader test runs in Node and builds its PDF in code. Add or update tests with each change. There is no linter. For UI changes, also open the app.

## Origin and visual fidelity

- The React app is a port of an original single-file HTML build (a compressed bundle with a custom template runtime), verified pixel-identical in headless Chrome. That file is no longer in the repo (it is gitignored, so a local copy may exist as `Compose (standalone).html`); the running app is now the reference.
- Keep the existing visuals unless asked to change them. Copy colours, spacing and fonts exactly; don't "improve" them.
- The original's runtime ignored `style-hover` attributes, so the port deliberately has **no hover effects**. It also never rendered line-chart y-axis labels, so those are omitted too.
- Since the port, Rewrite and the AI "Add"/Suggest modal were removed on purpose. Don't reintroduce them.

## Architecture

- `src/pages/Compose/ComposePage.jsx` owns page state and wires hooks to components. Props and callbacks go down; there's no Context or Redux.
- **Workspace/tabs:** `useWorkspace` owns `{ docs, activeId }` (each doc: `id, title, templateKey, blocks, fonts, layout`) and autosaves it under `nt-fb-workspace`, migrating the old single-doc keys. A doc's `templateKey` never changes; new templates mean a new tab (`createDoc`). Per-tab font settings become CSS variables on that tab's `.canvas` via `fontVars()`; never write them to `:root`. `layout` is `web` (continuous article) or `print-1`/`print-2` (A4 sheets). Print pagination: `Canvas` measures every block and paragraph after render (`measureUnits`, unzoomed `offsetHeight`) and `planPages` in `utils/pagination.js` fills columns/pages (paragraph splitting with widow/orphan control, heading keep-with-next, LaTeX-style figure floats). A split paragraph renders twice as `ProseBlock` slices (`skip`/`clip`), so both columns must be exactly the same width. Measured heights must never depend on placement or the layout oscillates (passes are capped at 6). Drag and drop is resolved once for the whole canvas by `dropBoundary` (geometry of `data-drop-index` / `data-drop-start` elements), never by per-block handlers. The LaTeX template is set to LaTeX `article` class 10pt exactly (sizes written with `pt()` in `data/index.js` and the `tpl-latex` font preset: 17.28pt title, 14.4pt section, 12pt subsection, 9pt abstract, 10/12pt body, 1in margins via `theme.pageMargin`, 10pt `\columnsep`) and keeps true sizes in two columns (`theme.twoColumnScale: 1`); keep any change to it on that standard. Other templates' two-column pages render their content at 80% (`TWO_COLUMN_SCALE`, CSS `zoom` on `data-page-content`, laid out wider so the sheet stays A4); `planPages` gets the same `scale`. Copy HTML keeps the A4 pages; `previewDocument` wraps it for the Preview tab and, with `autoPrint`, for Export PDF (the browser's print dialog, shown for A4 layouts only).
- `src/hooks/` holds one concern per hook. `useDocument` covers the active tab's blocks and per-tab undo/redo. It exposes `getBlocks()` (backed by a ref) so async AI calls and blur handlers read the latest document. Use it rather than a stale `blocks` closure.
- `src/utils/` holds framework-free logic: AI providers (`ai.js`), prompts, docx/pdf readers, block transforms (`blocks.js`).
- `src/data/index.js` holds block factories (`NEW_BLOCK`), the palette, `AI_FILL_TYPES`, AI models and `STORAGE_KEYS`.
- **Templates** (`TEMPLATES` in `src/data/index.js`, chosen per tab): each sets a canvas `look` (CSS variables on `.canvas`), a `theme` of per-element inline-style overrides passed down as the `theme` prop (`article`, `h1`, `body`, `byline.variant`, `quote`, `nutshell`, `table`, …; blocks spread `...theme.x` last), allowed `blocks` (filters the palette, the type menu and AI output), `aiRules` (appended to import and fill prompts), a `fontPreset` (the tab's starting typography) and a `starter` page. Themes must not set font family, size, weight, line height or letter spacing for h1/h2/h3/standfirst/body/list, because those come from the tab's font settings. On AI import the model only *suggests* a template (`suggestedTemplate`); the tab's template is kept. The LaTeX paper template also uses theme flags `numbering` (section/figure/table numbers computed in `Canvas`), `captions` (numbered `Caption` instead of figure headers), `paragraphIndent`, `abstractLabel`, `charts: "pgfplots"` (bar/line charts render via `PgfPlot` in pgfplots' default style, matching the .tex export; keep the editor and `latexExport.js` in step: figures and tables stay in one column, as rendered), `imageSlot` (plain `\fbox`-style placeholders at the same proportions as the export's, `SLOT_ASPECT`; pairs/galleries get (a)(b)(c) subfigure labels) and `texExport` (shows the Export .tex button; conversion in `utils/latexExport.js`, zipping in `utils/zip.js`).
- A document is a flat array of blocks: `{ id, type, html | a | b | text | lang | slots | cells | bars | rows }`. Consecutive `body`/`dropcap` blocks render as one contentEditable `ProseBlock`.
- **Book structure (Lab manual template only):** `chapter`/`appendix` (`CHAPTER_TYPES`) are numbered in `Canvas.numberBlocks`, own blocks up to the next chapter (`sectionEnd`) and carry `pageBreak` in print layouts (`planPages` starts a new page after flushing pending floats). `toc` gets an `outline` (headings + page numbers from the plan) from `Canvas`. `code` (`{ text, lang, a }`) is plain text coloured by `utils/highlight.js`. `code` and `toc` render a `[data-split]` element with `[data-split-lines]` inside: `measureUnits` reads its full height, line height and where the lines start (`top`), so `planPages` splits them at a line break like paragraphs, and `BlockFrame` passes the slice (`skip`/`clip`) to the body. Keep these blocks out of the LaTeX paper template (its .tex export doesn't convert them).
- **PDF import structure:** `fileReaders.pdfText` reads font names (after `getOperatorList`) and sizes relative to the body size, and writes markers into the text: `# Chapter N: Title` / `# Appendix X: Title`, `##`/`###` headings, ``` fences (rebuilt from x positions in fixed columns), `[[toc]]`, `[[image N]]` (pictures located through the operator list's transforms and cropped from a rendered page, browser only) and inline `**bold**` / `` `code` ``. `blocks.paraBlocks` turns these into blocks for both plain and AI import; the AI only sees code summarised (`promptPara`).
- **Drag-to-AI-fill:** dropping an `AI_FILL_TYPES` element beside prose inserts the template immediately. `useAiFill` then replaces it with an element built from the paragraph above the drop point, or from paragraphs selected when the drag started.
- **Photos:** uploads go through `prepareImage` (resized to ≤2000px; Chrome ignores CSS `url()` values over ~2 MB). Each slot is an `ImageSlot` (drag to pan, toolbar/pinch to zoom); framing lives in `block.frames[i] = { x, y, zoom }` beside `block.slots[i]` and renders as `object-position` + `transform: scale()` on an inline-styled `<img>`, so exports keep the crop. The .tex export bakes each slot's framing into the exported photo (`framedImages` in `utils/imageCrop.js`).
- **contentEditable pattern:** `EditableText` / `bindContent` write content via callback refs only when the node isn't focused, and commit on blur. Don't render editable text as React children.
- **Feedback and undo:** `useFlash` drives the one status note in the top bar: `flash(msg, err, action)`, with a role="status" live region for screen readers. After a destructive change, pass `undoOffer()` (ComposePage) as the action instead of asking with `window.confirm`; it only reverses that change. Only Reset and closing the last tab still confirm. A closed tab is kept in `closedRef` for UNDO (`workspace.reopenDoc`). The save label reads `workspace.saveState` (`saved`, `partial`, `failed`), and `useUnloadGuard` warns before leaving while work could be lost.
- **Keyboard and dialogs:** every modal goes through `ModalShell`/`useDialog`: focus moves in, Escape closes, Tab is trapped (not when `docked`), and focus returns to the opener. Clickable elements that aren't buttons get `pressable()` from `utils/dom.js` instead of becoming `<button>`s, so they keep their look; editing-only `role`/`tabindex` are stripped from exports in `cleanArticle`. Icon spans inside controls are `aria-hidden`, and icon-only controls carry an `aria-label`. Editor-wide keys live in `useShortcuts`. Block keys act on the selected block only while focus is outside text fields and controls. List any new shortcut in `ShortcutsModal`.
- **AI errors and cancelling:** `callAi`/`callAiJson` take `{ signal }`, and errors carry `status`, `provider` and `network`; `aiErrorMessage(e, config)` turns them into plain messages that name the provider. The AI import can be cancelled (Cancel, Escape), and a reply that arrives afterwards is dropped.
- **Inline styles inside article blocks are intentional.** "Copy HTML" exports the article DOM as-is, so that markup must carry its own styles. Everything outside the article (chrome, modals, toolbars) uses co-located CSS files.
- AI calls go straight from the browser to Anthropic, OpenAI, Gemini or Ollama, with the key stored in localStorage (Settings modal). There is no backend. Calls that expect JSON pass `{ json: true }` to `callAi` (OpenAI `response_format`, Gemini `responseMimeType`, Ollama `format`); an empty reply throws `EMPTY_REPLY`, and `parseJsonReply` keeps the complete part of a reply cut off at the token limit.

## Coding style (follow it)

- Plain JS + React 18 + Vite. No TypeScript, PropTypes or JSDoc.
- Function components only, as `function Foo() {}` declarations (not arrow consts). Use named exports; only `App` is `export default`.
- Destructure props in the signature. Name handlers `function handleX(e) {}`; trivial ones can be inline arrows.
- Hooks: one per file, named export `useX`, returning an object or a single value. Always clean up effects.
- Module-level constants are `SCREAMING_SNAKE_CASE` and sit above the component.
- Build className with a template literal plus a BEM modifier, e.g. `` `rail-btn${active ? " rail-btn--active" : ""}` ``. CSS classes are kebab-case.
- Double quotes, semicolons, 2-space indent, and explicit `.jsx`/`.js` in imports.
- Every component gets a co-located `.css` file. Global tokens and fonts live in `src/index.css`.
- Keep comments sparse and only for non-obvious *why*.

## Git

- Remote: `PanotAbhay/Compose`. Several teammates push to the same branches, so run `git pull --rebase` before pushing.
- **Never add Claude attribution** (no `Co-Authored-By: Claude`, no "Generated with Claude Code") in commits or PRs.
- Don't commit `dist/`, `node_modules/` or `.claude/settings.local.json`; all three are gitignored.
- `main` has diverged from the feature branch and holds a teammate's `.claude/settings.json` auto-pull hook. Expect overlap when merging.
