import { AI_MODELS } from "../data/index.js";
import { PDF_TRANSCRIBE_PROMPT } from "./prompts.js";
import { parseJsonReply } from "./blocks.js";

const ANTHROPIC_HEADERS = {
  "content-type": "application/json",
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
};

export function hasBuiltinModel() {
  return typeof window !== "undefined" && !!(window.claude && window.claude.complete);
}

export function resolveAiConfig(ai) {
  const a = ai || {};
  const provider = a.provider || "builtin";
  return { provider, model: a.model || AI_MODELS[provider], key: a.key || "" };
}

// Messages worth showing the user; anything else gets the caller's fallback.
export function aiErrorMessage(e) {
  const m = String((e && e.message) || e);
  if (/EMPTY_REPLY/.test(m)) return "THE MODEL SENT BACK NOTHING — TRY AGAIN, OR PICK A NON-REASONING MODEL IN SETTINGS.";
  return /api key|Settings|401|403|failed to fetch/i.test(m) ? m.toUpperCase().slice(0, 90) : null;
}

function geminiUrl(config) {
  return "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(config.model) + ":generateContent?key=" + encodeURIComponent(config.key);
}

function geminiText(d) {
  const p = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
  return String((p && p[0] && p[0].text) || "");
}

function anthropicText(d) {
  return (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

async function readError(label, r, length) {
  return new Error(label + " " + r.status + " " + (await r.text()).slice(0, length));
}

// Gemini 1.x and 2.0 models can't write more than 8,192 tokens and reject larger requests.
function geminiMaxTokens(model, maxTokens) {
  return /gemini-(1\.|2\.0)/.test(model) ? Math.min(maxTokens, 8192) : maxTokens;
}

// A reply with no text (a reasoning model can spend its whole budget thinking) can't be parsed;
// say so rather than report malformed JSON.
function replyText(text, label, stop) {
  const s = String(text || "");
  if (!s.trim()) throw new Error("EMPTY_REPLY " + label + (stop ? " (" + stop + ")" : ""));
  if (/length|max_tokens/i.test(stop)) console.warn("[Compose] " + label + " reply was cut off at the token limit; salvaging what arrived.");
  return s;
}

// One call site for every model provider. `json` asks providers that support it for JSON output.
export async function callAi(config, system, user, maxTokens, { json } = {}) {
  if (config.provider === "builtin") {
    if (!hasBuiltinModel()) {
      throw new Error("The built-in model is only available inside the design tool. Open Settings and choose a provider.");
    }
    return replyText(await window.claude.complete({
      model: config.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }), "Built-in model");
  }

  if (config.provider === "ollama") {
    const r = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        ...(json && { format: "json" }),
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!r.ok) throw new Error("Ollama " + r.status);
    const d = await r.json();
    return replyText(d.message && d.message.content, "Ollama", d.done_reason);
  }

  if (!config.key) throw new Error("No API key set. Open Settings to add one.");

  if (config.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { ...ANTHROPIC_HEADERS, "x-api-key": config.key },
      body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) throw await readError("Anthropic", r, 120);
    const d = await r.json();
    return replyText(anthropicText(d), "Anthropic", d.stop_reason);
  }

  if (config.provider === "openai") {
    const body = { model: config.model, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
    if (json) body.response_format = { type: "json_object" };
    if (/^(gpt-5|o\d)/.test(config.model)) body.max_completion_tokens = maxTokens;
    else body.max_tokens = maxTokens;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + config.key },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw await readError("OpenAI", r, 120);
    const d = await r.json();
    const choice = (d.choices && d.choices[0]) || {};
    return replyText(choice.message && choice.message.content, "OpenAI", choice.finish_reason);
  }

  if (config.provider === "gemini") {
    const r = await fetch(geminiUrl(config), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: geminiMaxTokens(config.model, maxTokens), ...(json && { responseMimeType: "application/json" }) },
      }),
    });
    if (!r.ok) throw await readError("Gemini", r, 120);
    const d = await r.json();
    return replyText(geminiText(d), "Gemini", d.candidates && d.candidates[0] && d.candidates[0].finishReason);
  }

  throw new Error("Unknown provider");
}

// The parsed JSON reply; one that can't be read is logged so it can be looked at.
export async function callAiJson(config, system, user, maxTokens) {
  const reply = await callAi(config, system, user, maxTokens, { json: true });
  try {
    return parseJsonReply(reply);
  } catch (e) {
    console.error("[Compose] unreadable JSON from the model:", reply);
    throw e;
  }
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Scanned PDFs have no text layer — hand the file to a vision model instead.
export async function transcribePdf(config, file) {
  if (config.provider !== "anthropic" && config.provider !== "gemini") {
    throw new Error("That PDF is scanned images. Choose Anthropic or Gemini in Settings to read it, or paste the text.");
  }
  if (!config.key) throw new Error("That PDF is scanned. Add an API key in Settings to read it, or paste the text.");
  if (file.size > 28 * 1024 * 1024) throw new Error("That PDF is too large to read with AI (max ~28MB).");

  const data = await readAsBase64(file);

  if (config.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { ...ANTHROPIC_HEADERS, "x-api-key": config.key, "anthropic-beta": "pdfs-2024-09-25" },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 16000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            { type: "text", text: PDF_TRANSCRIBE_PROMPT },
          ],
        }],
      }),
    });
    if (!r.ok) throw await readError("Anthropic", r, 140);
    return anthropicText(await r.json());
  }

  const r = await fetch(geminiUrl(config), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: "application/pdf", data } }, { text: PDF_TRANSCRIBE_PROMPT }] }],
      generationConfig: { maxOutputTokens: geminiMaxTokens(config.model, 16000) },
    }),
  });
  if (!r.ok) throw await readError("Gemini", r, 140);
  return geminiText(await r.json());
}
