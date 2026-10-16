import { useState } from "react";
import {
  FONT_OPTIONS, FONT_PRESETS, LETTER_SPACING_STEPS, LINE_HEIGHT_STEPS, SIZE_STEPS, TEXT_LEVELS, WEIGHTS, presetById,
} from "../../../data/fontSystems.js";

const fontLabel = (id) => (FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0]).label;
const WEIGHT_OPTIONS = WEIGHTS.map((w) => ({ id: w.value, label: w.label }));

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="fonts-row">
      <span className="modal-label" aria-hidden="true">{label}</span>
      <div className="fonts-seg" role="group" aria-label={label.toLowerCase()}>
        {options.map((o) => (
          <button key={o.id} className={"fonts-seg-btn" + (o.id === value ? " fonts-seg-btn--on" : "")} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LevelSection({ level, label, choice, open, onToggle, setLevel }) {
  const set = (patch) => setLevel(level, patch);
  return (
    <div className={"fonts-section" + (open ? " fonts-section--open" : "")}>
      <button className="fonts-section-head" onClick={onToggle} aria-expanded={open}>
        <span className="modal-label fonts-section-name">{label.toUpperCase()}</span>
        <span className="fonts-section-font">{fontLabel(choice.font)}</span>
        <span className="ms fonts-section-chevron" aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div className="fonts-section-body">
          <select className="modal-input settings-select" aria-label={label + " font"} value={choice.font} onChange={(e) => set({ font: e.target.value })}>
            {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <Segmented label="SIZE" options={SIZE_STEPS} value={choice.size} onChange={(size) => set({ size })} />
          <Segmented label="WEIGHT" options={WEIGHT_OPTIONS} value={choice.weight} onChange={(weight) => set({ weight })} />
          <Segmented label="LINE HEIGHT" options={LINE_HEIGHT_STEPS} value={choice.lh} onChange={(lh) => set({ lh })} />
          <Segmented label="LETTER SPACING" options={LETTER_SPACING_STEPS} value={choice.ls} onChange={(ls) => set({ ls })} />
        </div>
      )}
    </div>
  );
}

export function FontsPanel({ fonts, setLevel, applyPreset, reset, templatePreset }) {
  const [open, setOpen] = useState(null);
  // The tab's template typography comes first, then the general font systems.
  const presets = [presetById(templatePreset), ...FONT_PRESETS];

  return (
    <>
      <div className="modal-head">
        <div className="modal-kicker">TYPOGRAPHY</div>
        <div className="modal-desc">How headings and body text look in this document. Other tabs keep their own settings.</div>
      </div>
      <div className="settings-body">
        <div className="settings-field">
          <span className="modal-label" id="fonts-presets-label">PRESET FONT SYSTEM</span>
          <div className="fonts-presets" role="group" aria-labelledby="fonts-presets-label">
            {presets.map((p) => (
              <button key={p.id} className={"fonts-chip" + (fonts.preset === p.id ? " fonts-chip--on" : "")} aria-pressed={fonts.preset === p.id} onClick={() => applyPreset(p.id)}>
                <span className="fonts-chip-name">{p.id === templatePreset ? p.label + " (template)" : p.label}</span>
                <span className="fonts-chip-note">{p.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="fonts-sections">
          {TEXT_LEVELS.map((l) => (
            <LevelSection
              key={l.id}
              level={l.id}
              label={l.label}
              choice={fonts[l.id]}
              open={open === l.id}
              onToggle={() => setOpen(open === l.id ? null : l.id)}
              setLevel={setLevel}
            />
          ))}
        </div>
        <div className="modal-quote">Sizes and spacing are relative to the preset: M and Normal are the preset as designed. Picking a preset resets them.</div>
        <button className="modal-btn fonts-reset" onClick={reset}>Reset to template fonts</button>
      </div>
    </>
  );
}
