import { EditableText } from "./EditableText.jsx";
import { BODY_METRICS } from "./articleStyles.js";

const LIST_TEXT = {
  ...BODY_METRICS,
  color: "var(--ink-body)",
  margin: "0 0 18px",
};

const TEXT_VARIANTS = {
  h1: {
    as: "h1",
    placeholder: "Headline",
    style: { fontFamily: "var(--h1-font, var(--font-serif))", fontSize: "var(--h1-size, var(--serif-display))", fontWeight: "var(--h1-weight, 600)", lineHeight: "var(--h1-lh, 1.1)", letterSpacing: "var(--h1-ls, var(--serif-display-ls))", color: "var(--ink)", margin: "0 0 20px", textWrap: "balance" },
  },
  standfirst: {
    as: "p",
    placeholder: "Standfirst — one or two sentences",
    style: { fontFamily: "var(--standfirst-font, var(--font-sans))", fontSize: "var(--standfirst-size, var(--sans-lead))", fontWeight: "var(--standfirst-weight, 400)", lineHeight: "var(--standfirst-lh, 1.55)", letterSpacing: "var(--standfirst-ls, 0em)", color: "var(--ink-secondary)", margin: "0 0 24px", textWrap: "pretty" },
  },
  h2: {
    as: "h2",
    placeholder: "Sub-heading",
    style: { fontFamily: "var(--h2-font, var(--font-serif))", fontSize: "var(--h2-size, 26px)", fontWeight: "var(--h2-weight, 600)", lineHeight: "var(--h2-lh, 1.2)", letterSpacing: "var(--h2-ls, -0.02em)", color: "var(--ink)", margin: "44px 0 18px", textWrap: "balance" },
  },
  h3: {
    as: "h3",
    placeholder: "Smaller sub-heading",
    style: { fontFamily: "var(--h3-font, var(--font-sans))", fontSize: "var(--h3-size, 17px)", fontWeight: "var(--h3-weight, 700)", lineHeight: "var(--h3-lh, 1.3)", letterSpacing: "var(--h3-ls, var(--sans-body-ls))", color: "var(--ink)", margin: "32px 0 14px" },
  },
  bullets: { as: "ul", style: { ...LIST_TEXT, paddingLeft: 22, listStyle: "disc" } },
  numbered: { as: "ol", style: { ...LIST_TEXT, paddingLeft: 24, listStyle: "decimal" } },
};

// Which theme entry restyles each text type.
const THEME_PART = { h1: "h1", standfirst: "standfirst", h2: "h2", h3: "h3", bullets: "list", numbered: "list" };

// Same size as the abstract itself (\small in LaTeX), set bold.
const ABSTRACT_LABEL = { textAlign: "center", fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "var(--standfirst-size)", color: "var(--ink)", marginBottom: 6 };

export function TextBlock({ block, theme, number, onPatch }) {
  const variant = TEXT_VARIANTS[block.type];
  const style = { ...variant.style, ...theme[THEME_PART[block.type]] };
  const editable = {
    html: true,
    "data-ph": variant.placeholder,
    value: block.html,
    onCommit: (v) => onPatch((x) => { x.html = v; }),
  };

  // LaTeX-style "2.1  Heading": the number sits outside the editable text.
  if (theme.numbering && number && (block.type === "h2" || block.type === "h3")) {
    const Tag = variant.as;
    return (
      <Tag style={style}>
        <span style={{ marginRight: "1em" }}>{number}</span>
        <EditableText as="span" {...editable} />
      </Tag>
    );
  }

  if (theme.abstractLabel && block.type === "standfirst") {
    // In two columns LaTeX heads the abstract like a section (\section*), flush with the column top.
    const label = theme.abstractAsSection ? { ...TEXT_VARIANTS.h2.style, ...theme.h2, marginTop: 0 } : ABSTRACT_LABEL;
    return (
      <div>
        <div style={label}>{theme.abstractLabel}</div>
        <EditableText as={variant.as} {...editable} style={style} />
      </div>
    );
  }

  return <EditableText as={variant.as} {...editable} style={style} />;
}
