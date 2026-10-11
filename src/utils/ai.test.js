import { describe, it, expect, vi, afterEach } from "vitest";
import { callAi, callAiJson, aiErrorMessage } from "./ai.js";

function mockFetch(body) {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const sent = (fetch) => JSON.parse(fetch.mock.calls[0][1].body);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("callAi", () => {
  it("asks OpenAI for a JSON object when json is set", async () => {
    const fetch = mockFetch({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    await callAi({ provider: "openai", model: "gpt-5-mini", key: "k" }, "sys JSON", "user", 16000, { json: true });
    expect(sent(fetch).response_format).toEqual({ type: "json_object" });
    expect(sent(fetch).max_completion_tokens).toBe(16000);
  });

  it("leaves plain-text calls alone", async () => {
    const fetch = mockFetch({ choices: [{ message: { content: "hi" } }] });
    await callAi({ provider: "openai", model: "gpt-4o", key: "k" }, "s", "u", 100);
    expect(sent(fetch).response_format).toBeUndefined();
    expect(sent(fetch).max_tokens).toBe(100);
  });

  it("reports an empty reply instead of returning nothing", async () => {
    mockFetch({ choices: [{ message: { content: "" }, finish_reason: "length" }] });
    await expect(callAi({ provider: "openai", model: "gpt-5", key: "k" }, "s", "u", 100, { json: true })).rejects.toThrow(/EMPTY_REPLY OpenAI \(length\)/);
  });

  it("asks Gemini for JSON and caps 2.0 models at 8,192 tokens", async () => {
    const fetch = mockFetch({ candidates: [{ content: { parts: [{ text: "{}" }] }, finishReason: "STOP" }] });
    await callAi({ provider: "gemini", model: "gemini-2.0-flash", key: "k" }, "s", "u", 16000, { json: true });
    expect(sent(fetch).generationConfig).toEqual({ maxOutputTokens: 8192, responseMimeType: "application/json" });
  });

  it("lets newer Gemini models write the full budget", async () => {
    const fetch = mockFetch({ candidates: [{ content: { parts: [{ text: "{}" }] } }] });
    await callAi({ provider: "gemini", model: "gemini-2.5-pro", key: "k" }, "s", "u", 16000);
    expect(sent(fetch).generationConfig.maxOutputTokens).toBe(16000);
  });

  it("asks Ollama for JSON", async () => {
    const fetch = mockFetch({ message: { content: "{}" }, done_reason: "stop" });
    await callAi({ provider: "ollama", model: "llama3.1" }, "s", "u", 100, { json: true });
    expect(sent(fetch).format).toBe("json");
  });

  it("joins Anthropic's text blocks and warns when the reply was cut off", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch({ content: [{ type: "text", text: '{"a":' }, { type: "text", text: "1}" }], stop_reason: "max_tokens" });
    const text = await callAi({ provider: "anthropic", model: "claude-sonnet-4-5", key: "k" }, "s", "u", 100, { json: true });
    expect(text).toBe('{"a":1}');
    expect(warn).toHaveBeenCalled();
  });

  it("needs a key for hosted providers", async () => {
    await expect(callAi({ provider: "openai", model: "m", key: "" }, "s", "u", 10)).rejects.toThrow(/No API key/);
  });

  it("passes provider errors through with their status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "model not found" }));
    await expect(callAi({ provider: "openai", model: "nope", key: "k" }, "s", "u", 10)).rejects.toThrow("OpenAI 404 model not found");
  });
});

describe("callAiJson", () => {
  const OPENAI = { provider: "openai", model: "gpt-4o", key: "k" };

  it("asks for JSON and parses the reply", async () => {
    const fetch = mockFetch({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] });
    expect(await callAiJson(OPENAI, "s", "u", 100)).toEqual({ a: 1 });
    expect(sent(fetch).response_format).toEqual({ type: "json_object" });
  });

  it("logs a reply it can't read", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ choices: [{ message: { content: "Sorry, no." } }] });
    await expect(callAiJson(OPENAI, "s", "u", 100)).rejects.toThrow(SyntaxError);
    expect(error.mock.calls[0][1]).toBe("Sorry, no.");
  });
});

describe("aiErrorMessage", () => {
  it("explains an empty reply and passes key errors through", () => {
    expect(aiErrorMessage(new Error("EMPTY_REPLY OpenAI (length)"))).toMatch(/SENT BACK NOTHING/);
    expect(aiErrorMessage(new Error("No API key set. Open Settings to add one."))).toMatch(/^NO API KEY SET/);
    expect(aiErrorMessage(new Error("boom"))).toBeNull();
  });
});
