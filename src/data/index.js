export const STORAGE_KEYS = {
  doc: "nt-fb-doc",
  ai: "nt-fb-ai",
  zoom: "nt-fb-zoom",
  recovered: "nt-fb-recovered",
  legacyRecovered: "nt-feature-builder",
  template: "nt-fb-template",
  workspace: "nt-fb-workspace",
};

export const TEXTISH_TYPES = ["h1", "standfirst", "h2", "h3", "body", "dropcap", "bullets", "numbered"];
export const PROSE_TYPES = ["body", "dropcap"];
export const IMAGE_TYPES = ["image", "pair", "gallery"];
export const HEADING_TYPES = ["h2", "h3"];
// Chapters own everything up to the next chapter and open a new page in print layouts.
export const CHAPTER_TYPES = ["chapter", "appendix"];
// Headings that start a section: they keep with what follows and are listed by a contents block.
export const SECTION_TYPES = [...HEADING_TYPES, ...CHAPTER_TYPES];
// Dropped beside a paragraph, these are built by the AI from that text.
export const AI_FILL_TYPES = ["h2", "h3", "quote", "bullets", "numbered", "stats", "chart", "line", "poll", "table", "timeline", "nutshell"];

export const NEW_BLOCK = {
  h2: () => ({ type: "h2", html: "Sub-heading" }),
  h3: () => ({ type: "h3", html: "Smaller sub-heading" }),
  body: () => ({ type: "body", html: "New paragraph." }),
  dropcap: () => ({ type: "dropcap", html: "Opening paragraph of the feature." }),
  bullets: () => ({ type: "bullets", html: "<li>First point</li><li>Second point</li>" }),
  numbered: () => ({ type: "numbered", html: "<li>First step</li><li>Second step</li>" }),
  byline: () => ({ type: "byline", a: "Reporter Name", b: "Desk" }),
  quote: () => ({ type: "quote", a: "A line worth pulling out of the copy.", b: "— NAME, ROLE" }),
  image: () => ({ type: "image", slots: [""], a: "Caption for this photograph.", b: "PHOTO CREDIT" }),
  pair: () => ({ type: "pair", slots: ["", ""], a: "Caption describing both photographs.", b: "PHOTO CREDIT" }),
  gallery: () => ({ type: "gallery", slots: ["", "", ""], a: "Caption for the gallery.", b: "PHOTO CREDIT" }),
  stats: () => ({
    type: "stats",
    a: "By the numbers",
    b: "Source",
    cells: [
      { value: "~200", label: "PEOPLE SURVEYED" },
      { value: "86.5%", label: "FELT UNSAFE" },
      { value: "63.6%", label: "AVOID ROADS" },
      { value: "42.4%", label: "PAY EXTRA" },
    ],
  }),
  chart: () => ({
    type: "chart",
    a: "Chart title",
    b: "Unit",
    bars: [
      { label: "FIRST", value: 64 },
      { label: "SECOND", value: 50 },
      { label: "THIRD", value: 42 },
    ],
  }),
  line: () => ({
    type: "line",
    a: "Trend title",
    b: "Unit",
    bars: [
      { label: "2023", value: 18 },
      { label: "2024", value: 34 },
      { label: "2025", value: 52 },
      { label: "2026", value: 71 },
    ],
  }),
  poll: () => ({
    type: "poll",
    a: "Poll title",
    b: "% who agree",
    bars: [
      { label: "FIRST", value: 62 },
      { label: "SECOND", value: 45 },
      { label: "THIRD", value: 28 },
    ],
  }),
  table: () => ({
    type: "table",
    rows: [
      ["MEASURE", "WHAT IT FIXES", "ALSO HELPS"],
      ["First measure", "The problem", "Who else gains"],
      ["Second measure", "The problem", "Who else gains"],
    ],
  }),
  timeline: () => ({
    type: "timeline",
    rows: [
      { d: "2024", t: "First milestone", x: "What happened and why it mattered." },
      { d: "2025", t: "Second milestone", x: "What happened and why it mattered." },
      { d: "2026 · NEXT", t: "What comes next", x: "The open question." },
    ],
  }),
  nutshell: () => ({ type: "nutshell", a: "The Nutshell", html: "<li>First key point.</li><li>Second key point.</li><li>Third key point.</li>" }),
  divider: () => ({ type: "divider" }),
  code: () => ({ type: "code", lang: "sql", a: "", text: "SELECT ename, job, sal\nFROM emp\nWHERE deptno = 30\nORDER BY sal DESC;" }),
  chapter: () => ({ type: "chapter", html: "Chapter title" }),
  appendix: () => ({ type: "appendix", html: "Appendix title" }),
  toc: () => ({ type: "toc", a: "Contents" }),
};

export const PALETTE_GROUPS = [
  {
    key: "g-text",
    label: "TEXT",
    items: [
      { type: "body", label: "Paragraph", icon: "subject", hint: "Body paragraph" },
      { type: "h2", label: "Sub-heading", icon: "format_h2", hint: "Section sub-heading" },
      { type: "h3", label: "Small sub-head", icon: "format_h3", hint: "Smaller sub-heading" },
      { type: "dropcap", label: "Opening para", icon: "text_fields", hint: "Paragraph with a drop cap" },
      { type: "byline", label: "Attribution", icon: "badge", hint: "Author name, desk and read time" },
      { type: "quote", label: "Pull quote", icon: "format_quote", hint: "Pull quote with attribution" },
      { type: "bullets", label: "Bullet list", icon: "format_list_bulleted", hint: "Bulleted list" },
      { type: "numbered", label: "Numbered list", icon: "format_list_numbered", hint: "Numbered list" },
      { type: "divider", label: "Divider", icon: "horizontal_rule", hint: "Section divider" },
      { type: "code", label: "Code listing", icon: "code", hint: "Numbered code listing with syntax colours" },
    ],
  },
  {
    key: "g-structure",
    label: "STRUCTURE",
    items: [
      { type: "chapter", label: "Chapter", icon: "bookmark", hint: "Numbered chapter that starts a new page" },
      { type: "appendix", label: "Appendix", icon: "bookmark_add", hint: "Lettered appendix that starts a new page" },
      { type: "toc", label: "Contents", icon: "toc", hint: "Table of contents built from the headings" },
    ],
  },
  {
    key: "g-media",
    label: "MEDIA",
    items: [
      { type: "image", label: "Image", icon: "image", hint: "One photograph" },
      { type: "gallery", label: "Gallery", icon: "collections", hint: "Three-up gallery" },
      { type: "pair", label: "Image pair", icon: "splitscreen_right", hint: "Two photographs side by side" },
    ],
  },
  {
    key: "g-data",
    label: "DATA",
    items: [
      { type: "chart", label: "Bar chart", icon: "bar_chart", hint: "Vertical bar chart" },
      { type: "line", label: "Line chart", icon: "show_chart", hint: "Smooth curve showing a trend over time" },
      { type: "poll", label: "Poll bars", icon: "percent", hint: "Horizontal percentage bars" },
      { type: "table", label: "Table", icon: "table_chart", hint: "Rule-based table" },
      { type: "timeline", label: "Timeline", icon: "timeline", hint: "Dated timeline" },
      { type: "stats", label: "Stat row", icon: "tag", hint: "Row of big numbers" },
      { type: "nutshell", label: "Key facts", icon: "checklist", hint: "The Nutshell summary box" },
    ],
  },
];

export const TEXT_TYPE_OPTIONS = [
  { value: "h1", label: "Headline" },
  { value: "standfirst", label: "Standfirst" },
  { value: "h2", label: "Sub-heading" },
  { value: "h3", label: "Small sub-head" },
  { value: "dropcap", label: "Opening (drop cap)" },
  { value: "body", label: "Body" },
  { value: "bullets", label: "Bullet list" },
  { value: "numbered", label: "Numbered list" },
];

// Page layouts a document can use: one continuous web page, or A4 sheets with one or two columns.
export const LAYOUTS = [
  { key: "web", label: "Web", icon: "web", hint: "Web — one continuous page" },
  { key: "print-1", label: "A4", icon: "description", hint: "Print — A4 pages, single column" },
  { key: "print-2", label: "A4 · 2 col", icon: "view_column_2", hint: "Print — A4 pages, two columns" },
];
export const LAYOUT_KEYS = LAYOUTS.map((l) => l.key);

export const AI_MODELS = {
  builtin: "claude-sonnet-4-5",
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-5.6-terra",
  gemini: "gemini-2.0-flash",
  ollama: "llama3.1",
};

export const AI_PROVIDERS = [
  { value: "builtin", label: "Built-in (inside the design tool)" },
  { value: "anthropic", label: "Anthropic — Claude" },
  { value: "openai", label: "OpenAI — GPT" },
  { value: "gemini", label: "Google — Gemini" },
  { value: "ollama", label: "Ollama (runs on this machine)" },
];

// Each template sets the canvas look (CSS variable overrides), a theme of
// per-element style overrides (merged into the blocks' inline styles, so
// "Copy HTML" carries them), the blocks the palette offers, extra rules for
// the AI, and the demo page it starts from.
const DARK_TEXT = { color: "#2B2B2B" };
const NEWS_COLUMN = { maxWidth: 620, marginLeft: "auto", marginRight: "auto" };
const CM = "'CMU Serif', 'Latin Modern Roman', serif";
// LaTeX furniture text follows the tab's body font (Computer Modern by default).
const CM_TEXT = { fontFamily: "var(--body-font)", letterSpacing: "0", color: "#000000", textWrap: "auto" };
const LATEX_INK = { color: "#000000", textWrap: "auto" };
// LaTeX sizes are given in points (article class, 10pt) and drawn at 96 dpi.
const pt = (n) => (n * 4) / 3;
const LATEX_BODY = { ...CM_TEXT, fontSize: pt(10), lineHeight: 1.2 };

export const TEMPLATES = {
  news: {
    key: "news",
    fontPreset: "tpl-news",
    label: "News",
    icon: "newspaper",
    description: "Reported stories and features. A centred front-page headline, serif reading column, wide photos and The Nutshell summary.",
    look: {},
    theme: {
      article: { maxWidth: 840, padding: "60px 60px 160px 84px" },
      columns: { columnGap: 48, columnRule: "1px solid var(--rule)" },
      h1: { textAlign: "center", margin: "6px auto 18px", maxWidth: 680 },
      standfirst: { textAlign: "center", fontStyle: "italic", color: "var(--ink-secondary)", maxWidth: 600, margin: "0 auto 26px" },
      byline: { variant: "centered" },
      body: { ...DARK_TEXT, ...NEWS_COLUMN, marginBottom: 18 },
      list: { ...DARK_TEXT, ...NEWS_COLUMN, paddingLeft: 26, boxSizing: "border-box" },
      h2: { ...NEWS_COLUMN, margin: "48px auto 16px" },
      h3: { ...NEWS_COLUMN, textTransform: "uppercase", margin: "34px auto 12px" },
      quote: {
        wrap: { borderLeft: "none", borderTop: "2px solid var(--ink)", borderBottom: "1px solid var(--rule)", padding: "26px 10px 24px", margin: "44px auto", maxWidth: 560, textAlign: "center" },
        text: { fontStyle: "italic", fontSize: 30, lineHeight: 1.25 },
      },
      figure: { margin: "38px -44px" },
      nutshell: {
        box: { ...NEWS_COLUMN, background: "transparent", border: "none", borderTop: "3px solid var(--ink)", borderBottom: "1px solid var(--rule)", padding: "16px 0 20px", margin: "36px auto" },
        title: { fontFamily: "var(--h2-font)", fontSize: 21, fontWeight: 600 },
        list: { fontSize: 16.5, lineHeight: 1.65 },
      },
      timeline: { wrap: { ...NEWS_COLUMN, boxSizing: "border-box", marginTop: 32, marginBottom: 32 } },
      divider: { text: "•   •   •", style: { letterSpacing: "0.2em", color: "var(--muted)" } },
    },
    blocks: ["byline", "body", "h2", "h3", "dropcap", "quote", "bullets", "numbered", "divider", "image", "gallery", "pair", "chart", "line", "poll", "table", "timeline", "stats", "nutshell"],
    aiRules: [
      "ALWAYS one image at after:-1, plus 1–3 more image/pair/gallery at natural breaks.",
      "ALWAYS one nutshell at after:1 or after:2 — four plain-language bullets summarising the whole piece. This is the house signature; never skip it.",
      "quote: only real quoted speech present in the text, verbatim, max 3.",
    ],
    starter: [
      { type: "h1", html: "Dhaka’s commuters are rerouting their lives around unsafe roads" },
      { type: "standfirst", html: "A survey of 200 daily travellers finds most now avoid certain streets after dark — and four in ten pay more to do it. Here is what they told us, and what the city says it will change." },
      { type: "byline", a: "Farhana Islam", b: "Metro Desk, Dhaka" },
      { type: "image", slots: [""], a: "Evening traffic at Farmgate, one of the junctions respondents named most often.", b: "PHOTO: STAFF" },
      { type: "dropcap", html: "Every weekday at 6:40 a.m., Rumana Akter leaves her flat in Mirpur 10 and walks the long way to the bus stop. The direct route crosses a six-lane road with no working signal, and after two near-misses last winter she stopped taking it. Her detour adds eleven minutes each way. “It is not much,” she said. “But it is every day, and I am not the only one.”" },
      { type: "body", html: "She is not. In a survey of 200 regular commuters conducted by Nutshell Today across five districts of the capital in September, 86.5 percent said they had felt unsafe on the roads in the past month. Nearly two-thirds said they now avoid at least one route they used to take, and 42.4 percent said they regularly pay more — for a rickshaw instead of walking, or a ride-share instead of a bus — to feel safer." },
      { type: "body", html: "The findings land as the Dhaka North and South city corporations prepare a joint road-safety plan, due to be presented to the cabinet before the end of the year. Officials say it will prioritise pedestrian crossings and lighting at the twenty junctions with the worst accident records." },
      { type: "nutshell", a: "The Nutshell", html: "<li>Most commuters surveyed — 86.5% — felt unsafe on Dhaka’s roads in the past month.</li><li>Two-thirds have changed their route; four in ten pay extra to travel more safely.</li><li>Women and late-shift workers reported the biggest changes to their routines.</li><li>A city road-safety plan targeting the 20 worst junctions is due before the year ends.</li>" },
      { type: "h2", html: "Who is changing their routine" },
      { type: "body", html: "The burden is not shared equally. Women in the survey were almost twice as likely as men to say they had changed the time they travel, and garment workers on late shifts described walking in groups after leaving the factory gate at night." },
      { type: "body", html: "“We wait for each other at the gate,” said Shirin, 24, who works at a knitwear factory in Mirpur and asked that her family name not be used. “Ten, twelve of us walk together to the main road. Nobody goes alone.”" },
      { type: "stats", a: "By the numbers", b: "Nutshell Today survey, Sept 2026", cells: [{ value: "200", label: "COMMUTERS SURVEYED" }, { value: "86.5%", label: "FELT UNSAFE" }, { value: "63.6%", label: "CHANGED ROUTE" }, { value: "42.4%", label: "PAY EXTRA" }] },
      { type: "quote", a: "We are not asking for flyovers. We are asking for a light that works and a crossing where cars actually stop.", b: "— KAMRUL HASAN, PEDESTRIAN SAFETY CAMPAIGNER" },
      { type: "h2", html: "What the city has promised" },
      { type: "body", html: "City officials acknowledge the problem. A spokesperson for Dhaka North City Corporation said 140 broken streetlights on major corridors had been replaced since July, and that ten new signalled crossings would be installed by March." },
      { type: "timeline", rows: [{ d: "JULY 2026", t: "Streetlight repairs begin", x: "140 lights replaced on major corridors in Dhaka North." }, { d: "SEPT 2026", t: "Commuter survey", x: "86.5% of 200 travellers report feeling unsafe." }, { d: "DEC 2026", t: "Road-safety plan to cabinet", x: "Joint plan from both city corporations." }, { d: "MARCH 2027 · NEXT", t: "First new crossings open", x: "Ten signalled crossings promised at the worst junctions." }] },
      { type: "body", html: "Campaigners say the measures are welcome but slow. Until the crossings open, Rumana Akter will keep taking the long way round." },
      { type: "divider" },
    ],
  },
  finance: {
    key: "finance",
    fontPreset: "tpl-finance",
    label: "Finance",
    icon: "trending_up",
    description: "Markets, earnings and the economy. Salmon-paper briefing that leads with the numbers — stat rows, trend lines and results tables.",
    look: { "--red": "#0D7680", "--paper": "#FFF1E5", "--paper-faint": "#F7E3D2", "--rule": "#E6CDB8", "--rule-light": "#F0DAC8", "--ink": "#33302E", "--ink-body": "#3D3935", "--ink-secondary": "#5C5651", "--muted": "#857D76", "--placeholder": "#EBD5C3" },
    theme: {
      article: { maxWidth: 840, padding: "44px 44px 160px 80px" },
      columns: { columnGap: 44, columnRule: "1px solid var(--rule)" },
      h1: { borderTop: "6px solid var(--ink)", paddingTop: 18, margin: "0 0 16px" },
      standfirst: { color: "var(--ink-body)" },
      byline: { variant: "inline" },
      body: { color: "var(--ink)" },
      list: { color: "var(--ink)" },
      h2: { borderTop: "1px solid var(--ink)", paddingTop: 12, margin: "40px 0 14px" },
      h3: { color: "var(--red)" },
      quote: {
        wrap: { borderLeft: "4px solid var(--red)", padding: "4px 0 4px 22px" },
        text: { fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 24, lineHeight: 1.3, letterSpacing: "-0.01em" },
      },
      stats: { grid: { background: "var(--paper-faint)", padding: "18px 20px 16px" }, value: { fontWeight: 700 } },
      nutshell: {
        box: { background: "var(--paper-faint)", border: "none", borderLeft: "4px solid var(--red)" },
        title: { color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 13 },
      },
      divider: { text: "", style: { borderTop: "2px solid var(--ink)", height: 0 } },
    },
    blocks: ["byline", "body", "h2", "h3", "dropcap", "quote", "bullets", "divider", "image", "chart", "line", "table", "timeline", "stats", "nutshell"],
    aiRules: [
      "Lead with the market-moving number: put a stats row at after:1 when the text has 3+ headline figures.",
      "Figures tracked over time → line; comparisons across companies or sectors → chart or table.",
      "Keep every currency symbol, unit and decimal exactly as written. Never round.",
      "ALWAYS one nutshell at after:1 or after:2 titled \"What it means\" — four plain-language bullets for a non-expert reader.",
      "At most one image.",
    ],
    starter: [
      { type: "h1", html: "Banks lift DSEX to a five-month high as lenders post strong third-quarter profits" },
      { type: "standfirst", html: "The benchmark index rose 2.1 percent this week, led by the country’s largest private banks. Textile exporters lagged as orders from Europe slowed." },
      { type: "byline", a: "Tanvir Ahmed", b: "Business Desk" },
      { type: "stats", a: "Markets this week", b: "DSE, close of trading Thursday", cells: [{ value: "5,824", label: "DSEX" }, { value: "+2.1%", label: "WEEKLY CHANGE" }, { value: "Tk 9.4bn", label: "DAILY TURNOVER" }, { value: "110.4", label: "USD/BDT" }] },
      { type: "dropcap", html: "Shares in Bangladesh’s biggest private lenders climbed for a third straight week, pushing the DSEX to 5,824 points on Thursday — its highest close since May. Banking stocks accounted for more than a third of the week’s turnover as investors responded to third-quarter results that beat analysts’ expectations." },
      { type: "body", html: "Net profit at the five largest listed banks rose an average of 18 percent from a year earlier, helped by wider lending margins and a fall in bad-loan provisions. “The numbers removed a lot of the uncertainty that had been hanging over the sector,” said Nusrat Jahan, head of research at a Dhaka brokerage." },
      { type: "nutshell", a: "What it means", html: "<li>The stock market is at its highest level in five months.</li><li>Big banks earned more than expected, and investors bought their shares.</li><li>Clothing exporters fell because European buyers are ordering less.</li><li>If you hold a fund invested in shares, its value likely rose this week.</li>" },
      { type: "h2", html: "How the index moved" },
      { type: "line", a: "DSEX gain since the start of the month", b: "%", bars: [{ label: "WK 1", value: 0.4 }, { label: "WK 2", value: 1.1 }, { label: "WK 3", value: 1.6 }, { label: "WK 4", value: 2.1 }] },
      { type: "body", html: "Gains were steady rather than spectacular. The index added between 0.4 and 0.7 percent each week, while daily turnover climbed from Tk 6.8 billion at the start of the month to Tk 9.4 billion on Thursday — a sign that more investors are returning to the market." },
      { type: "h2", html: "Winners and losers by sector" },
      { type: "table", rows: [["SECTOR", "WEEKLY CHANGE", "TOP PERFORMER", "WHY"], ["Banks", "+4.8%", "Company A", "Q3 profit up 21%"], ["Pharmaceuticals", "+1.2%", "Company B", "Export licence renewed"], ["Telecoms", "+0.6%", "Company C", "Flat subscriber growth"], ["Textiles", "−0.9%", "Company D", "European orders down 7%"]] },
      { type: "body", html: "Textiles were the main drag. Exporters reported a 7 percent fall in new orders from European buyers in September, and two large manufacturers warned that margins would narrow in the final quarter." },
      { type: "quote", a: "Banks are pricing in a recovery. Exporters are still waiting for one. That gap will not last forever.", b: "— NUSRAT JAHAN, HEAD OF RESEARCH" },
      { type: "h2", html: "What to watch next" },
      { type: "bullets", html: "<li>Bangladesh Bank’s monetary policy statement, due in the second week of January.</li><li>October export figures from the Export Promotion Bureau.</li><li>Fourth-quarter guidance from the large textile groups.</li>" },
      { type: "body", html: "Analysts expect the rally to slow if the central bank signals that interest rates will stay high into next year." },
      { type: "divider" },
    ],
  },
  research: {
    key: "research",
    fontPreset: "tpl-research",
    label: "Research",
    icon: "science",
    description: "Papers and studies explained. Journal-style column with an abstract, key findings, method and results tables.",
    look: { "--red": "#1F4E9C", "--paper": "#FDFDFB", "--paper-faint": "#F2F4F8", "--rule": "#D8DBE2", "--rule-light": "#E6E8ED" },
    theme: {
      article: { maxWidth: 760, padding: "64px 56px 160px 84px" },
      columns: { columnGap: 40 },
      h1: { margin: "0 0 18px" },
      standfirst: { color: "var(--ink-body)", background: "var(--paper-faint)", borderLeft: "3px solid var(--red)", padding: "16px 20px", margin: "0 0 24px" },
      byline: { variant: "plain" },
      body: { ...DARK_TEXT, textAlign: "justify", hyphens: "auto" },
      list: { ...DARK_TEXT },
      h2: { textTransform: "uppercase", color: "var(--red)", margin: "40px 0 12px" },
      h3: { fontStyle: "italic" },
      quote: {
        wrap: { borderLeft: "none", padding: "0 44px", margin: "30px 0" },
        text: { fontSize: 20, fontStyle: "italic", lineHeight: 1.5 },
      },
      nutshell: {
        box: { background: "transparent", border: "1px solid var(--red)", padding: "18px 22px" },
        title: { color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12 },
        list: { fontSize: 15.5 },
      },
      table: { table: { borderTop: "2px solid var(--ink)", borderBottom: "2px solid var(--ink)" }, head: { paddingTop: 10, color: "var(--ink)" }, zebra: false },
      divider: { text: "§", style: { fontFamily: "var(--font-serif)", fontSize: 20, letterSpacing: "0", color: "var(--muted)" } },
    },
    blocks: ["byline", "body", "h2", "h3", "quote", "bullets", "numbered", "divider", "image", "pair", "chart", "line", "table", "timeline", "stats", "nutshell"],
    aiRules: [
      "The standfirst is a one- or two-sentence plain-language abstract of the study.",
      "ALWAYS one nutshell at after:0 or after:1 titled \"Key findings\" — 3–4 bullets.",
      "Use h2 for the paper's own sections (Introduction, Method, Results, Discussion) when the source has them; do not invent sections it lacks.",
      "Results with numbers → chart or table; tables flattened by PDF import must be rebuilt with replaceTo.",
      "quote only for a statement the text attributes to a named researcher. No drop caps.",
    ],
    starter: [
      { type: "h1", html: "Lightweight neural networks can diagnose rice leaf disease on low-cost smartphones" },
      { type: "standfirst", html: "Researchers trained five compact image-recognition models on 12,000 photographs of rice leaves from farms in northern Bangladesh. The best model identified four common diseases with 94 percent accuracy while running entirely offline on a phone that costs under Tk 12,000 — suggesting that reliable crop diagnosis could reach farmers without internet access." },
      { type: "byline", a: "S. Rahman, M. Chowdhury and A. Karim", b: "Department of Computer Science, University of Dhaka" },
      { type: "nutshell", a: "Key findings", html: "<li>A 4.2 MB model reached 94% accuracy across four rice diseases.</li><li>It ran offline in under 0.3 seconds per photo on an entry-level phone.</li><li>Accuracy fell to 81% for photos taken in poor light, the study’s main limitation.</li><li>Field trials with 300 farmers are planned for the 2027 growing season.</li>" },
      { type: "h2", html: "Introduction" },
      { type: "body", html: "Rice blast, bacterial leaf blight, brown spot and tungro together destroy an estimated 10 to 15 percent of Bangladesh’s rice harvest each year. Early diagnosis allows farmers to treat affected fields before disease spreads, but agricultural extension officers are stretched thin: in some upazilas a single officer serves more than 4,000 households." },
      { type: "body", html: "Smartphone-based diagnosis has been proposed as a way to close this gap, but most published systems rely on large models running on remote servers. In rural areas with patchy mobile coverage, that dependence on connectivity is a serious barrier. This study asks whether a model small enough to run on the phone itself can match the accuracy of server-based approaches." },
      { type: "h2", html: "Method" },
      { type: "numbered", html: "<li>We collected 12,000 photographs of healthy and diseased rice leaves from 38 farms in Rangpur and Dinajpur between June and October 2025.</li><li>Two plant pathologists independently labelled each image; images on which they disagreed (3.1%) were excluded.</li><li>We trained five model architectures, ranging from 1.5 MB to 4.2 MB, on 80% of the images.</li><li>We tested each model on the remaining 20%, and separately on 600 photographs taken in low light.</li>" },
      { type: "h2", html: "Results" },
      { type: "body", html: "All five models exceeded 80 percent accuracy on the main test set. The largest, Model A, performed best overall, while Model C offered the best trade-off for the cheapest phones, classifying an image in under 0.2 seconds." },
      { type: "chart", a: "Figure 1. Accuracy on the main test set", b: "%", bars: [{ label: "MODEL A", value: 94 }, { label: "MODEL B", value: 89 }, { label: "MODEL C", value: 86 }, { label: "MODEL D", value: 83 }, { label: "MODEL E", value: 81 }] },
      { type: "table", a: "Table 1. Evaluated architectures", rows: [["MODEL", "SIZE", "ACCURACY", "TIME PER IMAGE"], ["Model A", "4.2 MB", "94.1%", "0.28 s"], ["Model B", "3.1 MB", "89.4%", "0.22 s"], ["Model C", "2.0 MB", "86.0%", "0.17 s"], ["Model D", "1.5 MB", "81.3%", "0.12 s"]] },
      { type: "h2", html: "Discussion" },
      { type: "body", html: "The results show that offline diagnosis is feasible on hardware that many farming households already own. The drop in accuracy under poor lighting is the main obstacle to field use; adding low-light images to the training data and prompting users to photograph leaves in daylight are likely remedies." },
      { type: "quote", a: "The point is not to replace extension officers, but to give farmers an answer on the day they notice the problem.", b: "— DR S. RAHMAN, LEAD AUTHOR" },
      { type: "body", html: "The authors note that the dataset comes from a single region and season, and that performance on other rice varieties and in other parts of the country remains to be tested." },
      { type: "divider" },
    ],
  },
  latex: {
    key: "latex",
    fontPreset: "tpl-latex",
    label: "LaTeX paper",
    icon: "functions",
    description: "Typeset like a LaTeX article — Computer Modern, abstract, numbered sections, captioned figures and booktabs tables.",
    look: {
      "--paper": "#FFFFFF", "--paper-faint": "#FFFFFF", "--placeholder": "#EEEEEE", "--skeleton": "#EEEEEE",
      "--ink": "#000000", "--ink-body": "#000000", "--ink-secondary": "#000000", "--ink-soft": "#000000",
      "--muted": "#333333", "--muted-light": "#555555", "--rule": "#000000", "--rule-light": "#BBBBBB", "--red": "#2F4FA2",
      "--font-serif": CM, "--font-sans": CM, "--font-mono": "'CMU Typewriter Text', monospace",
    },
    theme: {
      article: { maxWidth: 720, padding: "72px 64px 160px 84px" },
      // \columnsep = 10pt; 1in page margins as in the .tex export; true sizes in two columns (no shrink).
      columns: { columnGap: pt(10) },
      pageMargin: 96,
      twoColumnScale: 1,
      numbering: true,
      paragraphIndent: true,
      abstractLabel: "Abstract",
      captions: true,
      charts: "pgfplots",
      // Same proportions and wording as the exported placeholder, so the PDF matches the page.
      imageSlot: {
        aspect: true,
        label: "Image placeholder",
        empty: { background: "#FFFFFF", border: "0.8px solid #000000" },
        text: { fontFamily: "var(--body-font)", fontStyle: "italic", fontSize: pt(10), color: "#555555" },
      },
      texExport: true,
      h1: { ...LATEX_INK, textAlign: "center", margin: "0 0 " + pt(15) + "px", textWrap: "balance" },
      byline: { variant: "latex" },
      // abstract: \small inside a quotation-style indent
      standfirst: { ...LATEX_INK, textAlign: "justify", hyphens: "auto", margin: "0 " + pt(25) + "px " + pt(20) + "px" },
      // In two columns article.cls sets only \maketitle across the page; the abstract becomes an
      // unnumbered \section*{Abstract} at normal size at the top of the first column.
      twoColumn: {
        masthead: ["h1", "byline"],
        abstractAsSection: true,
        standfirst: {
          ...LATEX_INK, textAlign: "justify", hyphens: "auto", margin: "0 0 " + pt(6) + "px",
          fontFamily: "var(--body-font)", fontSize: "var(--body-size)", fontWeight: "var(--body-weight)", lineHeight: "var(--body-lh)", letterSpacing: "var(--body-ls)",
        },
      },
      body: { ...LATEX_INK, textAlign: "justify", hyphens: "auto", margin: "0 0 " + pt(6) + "px" },
      list: { ...LATEX_INK, margin: pt(6) + "px 0 " + pt(8) + "px", paddingLeft: pt(25) },
      // \section: 3.5ex before, 2.3ex after; \subsection: 3.25ex / 1.5ex (at 10pt, 1ex ≈ 4.3pt)
      h2: { ...LATEX_INK, margin: pt(15) + "px 0 " + pt(10) + "px" },
      h3: { ...LATEX_INK, margin: pt(14) + "px 0 " + pt(6.5) + "px" },
      quote: {
        wrap: { borderLeft: "none", padding: 0, margin: pt(8) + "px " + pt(25) + "px " + pt(10) + "px" },
        text: LATEX_BODY,
        cite: { ...LATEX_BODY, textAlign: "right", marginTop: pt(3) },
      },
      figure: { margin: pt(14) + "px 0 " + pt(12) + "px" },
      nutshell: {
        box: { background: "transparent", border: "0.8px solid #000000", padding: pt(8) + "px " + pt(10) + "px", margin: pt(12) + "px 0" },
        title: { ...LATEX_BODY, marginBottom: pt(4) },
        list: LATEX_BODY,
      },
      // tabularx with equal X columns, \tabcolsep = 4pt and top-aligned (p-type) cells, as exported.
      table: {
        table: { tableLayout: "fixed", borderTop: "1.06px solid #000000", borderBottom: "1.06px solid #000000", marginTop: pt(3) },
        head: { ...LATEX_BODY, padding: pt(3) + "px " + pt(4) + "px " + pt(2) + "px", textAlign: "left", verticalAlign: "top" },
        cell: { ...LATEX_BODY, fontWeight: 400, padding: pt(1.5) + "px " + pt(4) + "px", textAlign: "left", verticalAlign: "top" },
        zebra: false,
        bodyRules: false,
      },
      divider: { text: "∗     ∗     ∗", style: { ...LATEX_BODY, letterSpacing: "0.1em", margin: pt(12) + "px 0" } },
    },
    blocks: ["byline", "body", "h2", "h3", "quote", "bullets", "numbered", "divider", "image", "pair", "gallery", "chart", "line", "table", "nutshell"],
    aiRules: [
      "Structure the piece like a LaTeX article: the standfirst is the abstract (2–4 sentences); h2 for numbered sections (e.g. Introduction, Related work, Method, Results, Conclusion) using the source's own sections where it has them; h3 for subsections.",
      "Never number headings yourself — the template numbers sections automatically.",
      "Charts, images and tables are numbered figures and tables: give each a caption-style title that describes it in one sentence.",
      "Prefer tables for exact results. Use bullets or numbered lists only for genuine lists (contributions, steps).",
      "quote only for a definition or statement the text quotes verbatim. No drop caps, stat rows, polls or timelines.",
      "nutshell only if the source lists key contributions or takeaways; title it \"Key points\".",
    ],
    starter: [
      { type: "h1", html: "Estimating Rooftop Solar Potential in Dhaka from Satellite Imagery" },
      { type: "byline", a: "Nadia Haque and Arif Hossain", b: "Department of Electrical and Electronic Engineering, BUET" },
      { type: "standfirst", html: "Dhaka’s dense rooftops are an untapped source of renewable energy, but no city-wide estimate of their solar potential exists. We segment usable rooftop area in 18,000 satellite tiles at 0.5 m resolution, covering the whole city, with a lightweight convolutional network, and convert that area to photovoltaic capacity. Our model reaches an intersection-over-union of 0.87 on hand-labelled tiles, and we estimate that suitable rooftops could host 1.9 GW of photovoltaic capacity — roughly a fifth of the city’s peak demand." },
      { type: "h2", html: "Introduction" },
      { type: "body", html: "Bangladesh generates most of its electricity from natural gas and imported fuel, leaving the grid exposed to price shocks and supply shortfalls. Rooftop solar offers a decentralised alternative that requires no new land, which is scarce in a city as dense as Dhaka." },
      { type: "body", html: "Planning such a programme requires knowing how much roof area is usable: flat or gently sloped, unshaded and structurally sound. Field surveys at city scale are slow and expensive. In this paper we show that freely available satellite imagery, combined with a small segmentation model, can produce a reliable first estimate. Our contributions are:" },
      { type: "bullets", html: "<li>a labelled dataset of 2,400 rooftop tiles covering six Dhaka neighbourhoods;</li><li>a segmentation model small enough to process the whole city on a single laptop;</li><li>a city-wide estimate of usable rooftop area and photovoltaic capacity.</li>" },
      { type: "h2", html: "Related work" },
      { type: "body", html: "Rooftop solar mapping has been studied extensively in Europe and North America, where high-resolution aerial imagery and building footprints are readily available. Comparable studies in South Asia are rare and typically limited to a single neighbourhood." },
      { type: "quote", a: "Replace this with a short quotation from a source in your bibliography.", b: "— Author (Year)" },
      { type: "h2", html: "Method" },
      { type: "h3", html: "Data" },
      { type: "body", html: "We obtained 0.5 m resolution imagery for the Dhaka North and South City Corporation areas and split it into 256 × 256 pixel tiles. Two annotators outlined usable rooftop area on 2,400 tiles, excluding water tanks, stairwells and shaded sections." },
      { type: "h3", html: "Model" },
      { type: "body", html: "We trained a U-Net with a MobileNetV3 encoder on 80% of the labelled tiles, holding out the remainder for evaluation. Training used standard flips and rotations and took under two hours on a single GPU." },
      { type: "image", slots: [""], a: "Example tile from Mirpur with the predicted usable rooftop area overlaid.", b: "" },
      { type: "h2", html: "Results" },
      { type: "body", html: "Table 1 compares our model with two baselines. The lightweight model matches the accuracy of the much larger ResNet-50 encoder while running five times faster, which makes city-scale inference practical." },
      { type: "table", a: "Segmentation accuracy on the held-out tiles.", rows: [["Model", "Parameters", "IoU", "Time per tile"], ["Threshold baseline", "—", "0.61", "0.01 s"], ["U-Net, ResNet-50", "32.5 M", "0.88", "0.42 s"], ["U-Net, MobileNetV3 (ours)", "6.6 M", "0.87", "0.08 s"]] },
      { type: "chart", a: "Estimated usable rooftop area by neighbourhood.", b: "Area (km²)", bars: [{ label: "Mirpur", value: 4.1 }, { label: "Uttara", value: 3.6 }, { label: "Mohammadpur", value: 2.4 }, { label: "Gulshan", value: 1.8 }, { label: "Old Dhaka", value: 1.1 }, { label: "Dhanmondi", value: 0.4 }] },
      { type: "body", html: "Applying the model to all 18,000 tiles (about 295 km²) yields 13.4 km² of usable rooftop area; Figure 2 breaks it down by neighbourhood. At a conservative 140 W per square metre, this corresponds to 1.9 GW of installable capacity." },
      { type: "h2", html: "Conclusion" },
      { type: "body", html: "Satellite imagery and a compact segmentation model are enough to produce a credible city-wide estimate of rooftop solar potential in Dhaka. Future work will validate the estimate against field surveys and account for structural load limits." },
    ],
  },
  lab: {
    key: "lab",
    fontPreset: "tpl-lab",
    label: "Lab manual",
    icon: "biotech",
    description: "Step-by-step practicals. Worksheet layout with a boxed aim, section banners, safety callout and fill-in results tables.",
    look: { "--red": "#C26A12", "--paper": "#F7F7F5", "--paper-faint": "#EEEEEA", "--rule": "#CFCFC8", "--rule-light": "#E2E2DC", "--font-serif": "var(--font-sans)" },
    theme: {
      article: { maxWidth: 860, padding: "44px 44px 160px 80px" },
      columns: { columnGap: 44, columnRule: "1px dashed var(--rule)" },
      h1: { margin: "0 0 16px" },
      standfirst: { color: "var(--ink)", background: "#FFFFFF", border: "1.5px solid var(--ink)", padding: "14px 18px", margin: "0 0 22px" },
      byline: { variant: "mono" },
      list: { lineHeight: 1.95 },
      h2: { textTransform: "uppercase", color: "#FFFFFF", background: "var(--ink)", padding: "9px 14px", margin: "36px 0 16px" },
      h3: { color: "var(--red)" },
      nutshell: {
        box: { background: "#FDF3E6", border: "none", borderLeft: "5px solid var(--red)", padding: "18px 22px" },
        title: { color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 13 },
        list: { color: "var(--ink)" },
      },
      table: { grid: true, zebra: false },
      divider: { text: "", style: { borderTop: "1.5px dashed var(--rule)", height: 0 } },
      chapter: {
        label: { color: "var(--red)" },
        title: { borderBottom: "3px solid var(--ink)", paddingBottom: 12 },
      },
      code: { wrap: { background: "#FFFFFF", border: "1.5px solid var(--ink)" } },
    },
    blocks: ["byline", "body", "h2", "h3", "bullets", "numbered", "divider", "code", "image", "pair", "chart", "line", "table", "stats", "nutshell", "chapter", "appendix", "toc"],
    aiRules: [
      "Structure as sections with h2: Aim, Safety, Equipment, Procedure, Results, Questions — using only those the source covers.",
      "Equipment and materials → bullets. Procedure → numbered, one action per step, keeping every quantity, temperature and time exactly.",
      "Safety warnings go in ONE nutshell titled \"Safety\" placed before the procedure.",
      "Results to record → table with empty cells for the student; measured relationships → line.",
      "No pull quotes, no drop caps, no timelines.",
      "A long manual with several labs is a book: chapter per lab or part, appendix for reference material at the end (scripts, tables, answers), one toc after the title. Keep the source's own chapters when it has them.",
      "Commands, queries, scripts and program output → code, copied verbatim with one line per source line.",
    ],
    starter: [
      { type: "h1", html: "Experiment 3: How temperature affects the rate of a reaction" },
      { type: "standfirst", html: "Aim: to measure how quickly sodium thiosulfate reacts with hydrochloric acid at four temperatures, and to explain the results using collision theory." },
      { type: "byline", a: "Chemistry 101 · Practical 3", b: "Lab B · Week 6 · 90 minutes" },
      { type: "nutshell", a: "Safety", html: "<li>Wear safety goggles and a lab coat throughout the practical.</li><li>Hydrochloric acid (1 M) is an irritant. If it touches your skin, rinse with plenty of water and tell your demonstrator.</li><li>The reaction releases sulfur dioxide gas. Keep the room ventilated and do not lean over the flask.</li><li>Water above 50 °C can scald — handle the water bath with tongs.</li>" },
      { type: "h2", html: "Background" },
      { type: "body", html: "When sodium thiosulfate reacts with hydrochloric acid it produces a fine yellow precipitate of sulfur that gradually turns the solution cloudy. By timing how long it takes for a cross drawn beneath the flask to disappear, you can compare how fast the reaction goes under different conditions." },
      { type: "body", html: "Collision theory predicts that particles move faster at higher temperatures, so they collide more often and with more energy. You should therefore expect the cross to disappear more quickly as the temperature rises." },
      { type: "h2", html: "Equipment" },
      { type: "bullets", html: "<li>100 ml conical flask</li><li>10 ml and 50 ml measuring cylinders</li><li>Sodium thiosulfate solution, 40 g/dm³ (50 ml per run)</li><li>Hydrochloric acid, 1 M (5 ml per run)</li><li>Water bath with thermometer</li><li>Stopwatch</li><li>White card marked with a bold black cross</li>" },
      { type: "h2", html: "Procedure" },
      { type: "numbered", html: "<li>Draw a bold black cross on the white card and place it on the bench.</li><li>Measure 50 ml of sodium thiosulfate solution into the conical flask using the large measuring cylinder.</li><li>Warm the flask in the water bath until the solution reaches 20 °C. Record the exact temperature.</li><li>Place the flask on the cross. Using the small cylinder, add 5 ml of hydrochloric acid and start the stopwatch immediately.</li><li>Swirl the flask once, then look down through the solution from above.</li><li>Stop the stopwatch as soon as the cross can no longer be seen. Record the time.</li><li>Empty and rinse the flask, then repeat steps 2–6 at 30 °C, 40 °C and 50 °C.</li><li>Repeat the whole experiment a second time and calculate a mean time for each temperature.</li>" },
      { type: "pair", slots: ["", ""], a: "Left: the cross before adding acid. Right: the same flask once the cross has disappeared.", b: "PHOTO: LAB TECHNICIAN" },
      { type: "h2", html: "Results" },
      { type: "body", html: "Record your times in the table below, then calculate the rate for each temperature as 1 ÷ mean time." },
      { type: "table", rows: [["TEMPERATURE (°C)", "RUN 1 (S)", "RUN 2 (S)", "MEAN (S)", "RATE (1/S)"], ["20", "", "", "", ""], ["30", "", "", "", ""], ["40", "", "", "", ""], ["50", "", "", "", ""]] },
      { type: "line", a: "Expected shape of your graph", b: "Rate (1/s)", bars: [{ label: "20 °C", value: 0.01 }, { label: "30 °C", value: 0.018 }, { label: "40 °C", value: 0.031 }, { label: "50 °C", value: 0.052 }] },
      { type: "h2", html: "Questions" },
      { type: "numbered", html: "<li>Plot rate against temperature. Describe the shape of your graph.</li><li>Use collision theory to explain the trend you observed.</li><li>Identify one source of random error and one source of systematic error in this method.</li><li>Suggest how the method could be changed to make the timing more precise.</li>" },
    ],
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);
