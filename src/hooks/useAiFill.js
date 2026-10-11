import { useState } from "react";
import { callAiJson, aiErrorMessage } from "../utils/ai.js";
import { elementToBlock, quotedInSource } from "../utils/blocks.js";
import { elementPrompt } from "../utils/prompts.js";

function plainText(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Replace a freshly dropped template block with one the AI builds from nearby paragraphs.
export function useAiFill({ getBlocks, save, flash, aiConfig, rules }) {
  const [building, setBuilding] = useState([]);

  async function fillFromText(blockId, type, sourceIds) {
    const blocks = getBlocks();
    const text = sourceIds
      .map((id) => plainText((blocks.find((b) => b.id === id) || {}).html))
      .filter(Boolean)
      .join("\n\n");
    if (!text) return;

    const count = sourceIds.length;
    setBuilding((ids) => [...ids, blockId]);
    flash("BUILDING " + type.toUpperCase() + " FROM " + (count > 1 ? count + " PARAGRAPHS" : "THE PARAGRAPH") + "…");

    try {
      const element = await callAiJson(aiConfig, elementPrompt(count, type, rules), text, count > 1 ? 4000 : 1400);
      const blk = elementToBlock(element, "% who agree");
      if (!blk) throw new Error("no element");
      // A pull quote the model paraphrased from reported speech would put words in someone's mouth.
      if (blk.type === "quote" && !quotedInSource(blk.a, text)) {
        flash("NO DIRECT QUOTE IN THAT TEXT — A PULL QUOTE NEEDS WORDS IN QUOTATION MARKS.", true);
        return;
      }
      const cur = getBlocks();
      // The editor may have deleted the placeholder while the model was working.
      if (!cur.some((b) => b.id === blockId)) return;
      save(cur.map((b) => (b.id === blockId ? { ...blk, id: blockId } : b)));
      flash("BUILT " + blk.type.toUpperCase() + " FROM THE TEXT — CTRL+Z FOR THE BLANK ONE");
    } catch (e) {
      flash(aiErrorMessage(e) || "COULDN’T BUILD IT FROM THE TEXT — FILL IN THE BLANK ONE BY HAND.", true);
    } finally {
      setBuilding((ids) => ids.filter((id) => id !== blockId));
    }
  }

  return { building, fillFromText };
}
