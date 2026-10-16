import { useState } from "react";
import { AI_MODELS, AI_PROVIDERS } from "../../../data/index.js";
import { ModalShell } from "./ModalShell.jsx";
import { FontsPanel } from "./FontsPanel.jsx";
import "./SettingsModal.css";

const TABS = [
  { id: "ai", label: "AI MODEL" },
  { id: "fonts", label: "FONTS" },
];

// How each provider's keys begin, to catch a key pasted under the wrong provider.
const KEY_SHAPES = [
  { provider: "anthropic", name: "an Anthropic", test: /^sk-ant-/, placeholder: "sk-ant-…" },
  { provider: "openai", name: "an OpenAI", test: /^sk-(?!ant-)/, placeholder: "sk-…" },
  { provider: "gemini", name: "a Google Gemini", test: /^AIza/, placeholder: "AIza…" },
];

function providerNote(provider) {
  if (provider === "builtin") return "Only available when Compose runs inside the tool it was built in. Here, choose Anthropic, OpenAI, Gemini or Ollama.";
  if (provider === "ollama") return "Calls Ollama on this machine at localhost:11434. No key needed; nothing leaves your computer.";
  return "Your key is stored only in this browser and sent straight to the provider. Don’t publish a copy of this file with a key saved in it.";
}

function keyWarning(provider, key) {
  const k = String(key || "").trim();
  const expected = KEY_SHAPES.find((s) => s.provider === provider);
  if (!k || !expected || expected.test.test(k)) return "";
  const owner = KEY_SHAPES.find((s) => s.test.test(k));
  return owner ? "This looks like " + owner.name + " key, not " + expected.name + " one. " : "";
}

function AiPanel({ aiConfig, onSave }) {
  const needsKey = aiConfig.provider !== "builtin" && aiConfig.provider !== "ollama";
  const shape = KEY_SHAPES.find((s) => s.provider === aiConfig.provider);

  return (
    <>
      <div className="modal-head">
        <div className="modal-kicker">AI MODEL</div>
        <div className="modal-desc">Which model does the formatting.</div>
      </div>
      <div className="settings-body">
        <div className="settings-field">
          <label className="modal-label" htmlFor="settings-provider">PROVIDER</label>
          <select
            id="settings-provider"
            className="modal-input settings-select"
            value={aiConfig.provider}
            onChange={(e) => onSave({ provider: e.target.value, model: AI_MODELS[e.target.value] || "" })}
          >
            {AI_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="settings-field">
          <label className="modal-label" htmlFor="settings-model">MODEL</label>
          <input id="settings-model" className="modal-input settings-mono" value={aiConfig.model} onChange={(e) => onSave({ model: e.target.value })} spellCheck={false} />
        </div>
        {needsKey && (
          <div className="settings-field">
            <label className="modal-label" htmlFor="settings-key">API KEY</label>
            <input
              id="settings-key"
              className="modal-input settings-mono"
              value={aiConfig.key}
              onChange={(e) => onSave({ key: e.target.value })}
              type="password"
              spellCheck={false}
              autoComplete="off"
              placeholder={shape ? shape.placeholder : "sk-…"}
            />
          </div>
        )}
        <div className="modal-quote" aria-live="polite">{(needsKey ? keyWarning(aiConfig.provider, aiConfig.key) : "") + providerNote(aiConfig.provider)}</div>
      </div>
    </>
  );
}

export function SettingsModal({ aiConfig, onSave, fonts, onClose }) {
  const [tab, setTab] = useState("ai");

  return (
    <ModalShell variant="settings" docked={tab === "fonts"} label="Settings" onClose={onClose}>
      <div className="settings-tabs" role="tablist" aria-label="Settings">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={"settings-tab" + (tab === t.id ? " settings-tab--on" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="settings-scroll">
        {tab === "fonts" ? <FontsPanel {...fonts} /> : <AiPanel aiConfig={aiConfig} onSave={onSave} />}
      </div>
      <div className="modal-footer">
        <button className="modal-btn modal-btn--primary" onClick={onClose}>Done</button>
      </div>
    </ModalShell>
  );
}
