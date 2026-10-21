// Fonts the typography settings can pick from. `google` fonts are fetched on demand;
// the rest ship with the app (see @font-face in index.css) or the OS.
export const FONT_OPTIONS = [
  { id: "baskervville", label: "Baskervville", stack: "'Baskervville', Georgia, serif" },
  { id: "satoshi", label: "Satoshi", stack: "'Satoshi', system-ui, sans-serif" },
  { id: "roboto-mono", label: "Roboto Mono", stack: "'Roboto Mono', ui-monospace, monospace" },
  { id: "playfair", label: "Playfair Display", stack: "'Playfair Display', Georgia, serif", google: "Playfair+Display" },
  { id: "lora", label: "Lora", stack: "'Lora', Georgia, serif", google: "Lora" },
  { id: "merriweather", label: "Merriweather", stack: "'Merriweather', Georgia, serif", google: "Merriweather" },
  { id: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter" },
  { id: "dm-sans", label: "DM Sans", stack: "'DM Sans', system-ui, sans-serif", google: "DM+Sans" },
  { id: "space-grotesk", label: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk" },
  { id: "georgia", label: "Georgia (system)", stack: "Georgia, 'Times New Roman', serif" },
  { id: "cmu", label: "Computer Modern", stack: "'CMU Serif', 'Latin Modern Roman', serif" },
];

// Text styles the settings control, in the order the panel lists them.
export const TEXT_LEVELS = [
  { id: "h1", label: "H1 · Headline" },
  { id: "h2", label: "H2 · Sub-heading" },
  { id: "h3", label: "H3 · Small sub-heading" },
  { id: "standfirst", label: "Standfirst" },
  { id: "body", label: "Body text" },
];

// Size, line height and letter spacing are steps relative to the preset's own values,
// so "M" / "Normal" always means "as the preset designed it".
export const SIZE_STEPS = [
  { id: "s", label: "S", scale: 0.85 },
  { id: "m", label: "M", scale: 1 },
  { id: "l", label: "L", scale: 1.15 },
  { id: "xl", label: "XL", scale: 1.3 },
];

export const LINE_HEIGHT_STEPS = [
  { id: "tight", label: "Tight", delta: -0.1 },
  { id: "normal", label: "Normal", delta: 0 },
  { id: "loose", label: "Loose", delta: 0.15 },
];

export const LETTER_SPACING_STEPS = [
  { id: "tight", label: "Tight", delta: -0.015 },
  { id: "normal", label: "Normal", delta: 0 },
  { id: "wide", label: "Wide", delta: 0.03 },
];

export const WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
];

const type = (font, size, weight, lh, ls) => ({ font, size, weight, lh, ls });

export const FONT_PRESETS = [
  {
    id: "editorial", label: "Editorial", note: "Baskervville + Satoshi",
    h1: type("baskervville", 42, 600, 1.1, -0.03), h2: type("baskervville", 26, 600, 1.2, -0.02),
    h3: type("satoshi", 17, 700, 1.3, 0.075), standfirst: type("satoshi", 18, 400, 1.55, 0),
    body: type("satoshi", 14, 400, 1.85, 0.075),
  },
  {
    id: "classic", label: "Classic", note: "Playfair + Lora",
    h1: type("playfair", 44, 700, 1.1, -0.02), h2: type("playfair", 28, 600, 1.2, -0.01),
    h3: type("lora", 18, 700, 1.3, 0), standfirst: type("lora", 19, 400, 1.55, 0),
    body: type("lora", 15, 400, 1.8, 0),
  },
  {
    id: "modern", label: "Modern", note: "Inter throughout",
    h1: type("inter", 40, 700, 1.1, -0.035), h2: type("inter", 24, 600, 1.25, -0.02),
    h3: type("inter", 17, 700, 1.3, -0.01), standfirst: type("inter", 18, 400, 1.55, 0),
    body: type("inter", 14, 400, 1.75, 0),
  },
  {
    id: "magazine", label: "Magazine", note: "Playfair + DM Sans",
    h1: type("playfair", 48, 600, 1.05, -0.025), h2: type("dm-sans", 24, 700, 1.2, -0.01),
    h3: type("dm-sans", 17, 700, 1.3, 0), standfirst: type("dm-sans", 19, 400, 1.55, 0),
    body: type("dm-sans", 15, 400, 1.75, 0),
  },
  {
    id: "technical", label: "Technical", note: "Space Grotesk + Inter",
    h1: type("space-grotesk", 40, 700, 1.1, -0.03), h2: type("space-grotesk", 24, 600, 1.2, -0.02),
    h3: type("space-grotesk", 17, 600, 1.3, -0.01), standfirst: type("inter", 18, 400, 1.55, 0),
    body: type("inter", 14, 400, 1.7, 0),
  },
  {
    id: "warm", label: "Warm", note: "Merriweather throughout",
    h1: type("merriweather", 38, 700, 1.2, -0.01), h2: type("merriweather", 24, 700, 1.3, 0),
    h3: type("merriweather", 17, 700, 1.35, 0), standfirst: type("merriweather", 18, 400, 1.6, 0),
    body: type("merriweather", 14, 400, 1.9, 0),
  },
];

// Each template's own typography, the starting point for a tab's font settings.
const TEMPLATE_FONT_PRESETS = [
  {
    id: "tpl-news", label: "News", note: "Baskervville + Satoshi",
    h1: type("baskervville", 50, 600, 1.08, -0.025), h2: type("baskervville", 28, 600, 1.2, -0.02),
    h3: type("satoshi", 14, 700, 1.3, 0.1), standfirst: type("baskervville", 20, 400, 1.5, 0),
    body: type("baskervville", 17.5, 400, 1.75, 0),
  },
  {
    id: "tpl-finance", label: "Finance", note: "Satoshi throughout",
    h1: type("satoshi", 40, 700, 1.1, -0.025), h2: type("satoshi", 21, 700, 1.25, -0.01),
    h3: type("satoshi", 17, 700, 1.3, 0.075), standfirst: type("satoshi", 19, 400, 1.45, 0),
    body: type("satoshi", 15, 400, 1.7, 0.01),
  },
  {
    id: "tpl-research", label: "Research", note: "Baskervville + Satoshi labels",
    h1: type("baskervville", 38, 400, 1.18, -0.015), h2: type("satoshi", 13, 700, 1.3, 0.16),
    h3: type("baskervville", 18, 400, 1.3, 0), standfirst: type("baskervville", 15.5, 400, 1.7, 0),
    body: type("baskervville", 16.5, 400, 1.7, 0),
  },
  {
    // article class at 10pt: \LARGE 17.28/22pt title, \Large 14.4/18pt section, \large 12/14pt
    // subsection, \small 9/11pt abstract, \normalsize 10/12pt body (pt × 4/3 = px).
    id: "tpl-latex", label: "LaTeX", note: "Computer Modern, article 10pt",
    h1: type("cmu", 23.04, 400, 1.27, 0), h2: type("cmu", 19.2, 700, 1.25, 0),
    h3: type("cmu", 16, 700, 1.17, 0), standfirst: type("cmu", 12, 400, 1.22, 0),
    body: type("cmu", 13.33, 400, 1.2, 0),
  },
  {
    id: "tpl-lab", label: "Lab manual", note: "Satoshi throughout",
    h1: type("satoshi", 36, 700, 1.12, -0.02), h2: type("satoshi", 14, 700, 1.3, 0.1),
    h3: type("satoshi", 17, 700, 1.3, 0.075), standfirst: type("satoshi", 16, 400, 1.6, 0),
    body: type("satoshi", 15, 400, 1.7, 0.01),
  },
];


export const presetById = (id) =>
  TEMPLATE_FONT_PRESETS.find((p) => p.id === id) || FONT_PRESETS.find((p) => p.id === id) || TEMPLATE_FONT_PRESETS[0];

// Settings state for a preset as designed: its fonts and weights, every step at the middle.
export function presetSettings(id) {
  const p = presetById(id);
  const settings = { preset: p.id };
  for (const { id: level } of TEXT_LEVELS) {
    settings[level] = { font: p[level].font, weight: p[level].weight, size: "m", lh: "normal", ls: "normal" };
  }
  return settings;
}
