// Article blocks keep their styles inline: "Copy HTML" exports the article DOM
// as-is, so the markup has to carry its own styling to paste anywhere.

// Body copy follows the font settings; falls back to the house sans when none are set.
export const BODY_FONT = "var(--body-font, var(--font-sans))";

// Paragraphs and lists share the body size, weight and spacing from the font settings.
export const BODY_METRICS = {
  fontFamily: BODY_FONT,
  fontSize: "var(--body-size, var(--sans-body))",
  fontWeight: "var(--body-weight, 400)",
  lineHeight: "var(--body-lh, 1.85)",
  letterSpacing: "var(--body-ls, var(--sans-body-ls))",
};

export const BODY_TEXT = {
  ...BODY_METRICS,
  color: "var(--ink-body)",
  margin: "0 0 18px",
  textWrap: "pretty",
};

export const FIGURE = { margin: "32px 0" };

export const MONO_OVERLINE = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--mono-overline)",
  letterSpacing: "var(--mono-overline-ls)",
};

export const MONO_LABEL = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--mono-label)",
  letterSpacing: "var(--mono-label-ls)",
};

// A number typed into a chart, ignoring units and other characters ("12.5%" → 12.5).
export function parseValue(v, signed = false) {
  return parseFloat(String(v).replace(signed ? /[^\d.-]/g : /[^\d.]/g, "")) || 0;
}

export function maxValue(rows) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return max <= 0 ? 100 : max;
}
