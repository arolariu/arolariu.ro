/**
 * @fileoverview Slot-extractor implementation (Layer 2, Qwen2.5-1.5B in-process).
 * @module app/domains/invoices/_components/ai/workers/slotExtractor.implementation
 *
 * @remarks
 * Uses WebLLM's MLCEngine in-process inside the Comlink-exposed worker.
 * JSON-mode + temperature=0 for deterministic output. Defensive: rejects
 * hallucinated intents not in the candidate list.
 */

import {MLCEngine} from "@mlc-ai/web-llm";
import type {ExtractInput, ExtractOutput, SlotExtractorWorkerApi} from "./slotExtractor.api";

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;

const SYSTEM_PROMPT = `You are an intent + slot extractor for an invoice analytics assistant.
Pick exactly ONE intent from the candidate list. Extract slots according to this grammar:
- timeframe: one of "this-week", "last-week", "this-month", "last-month", "last-3-months", "last-6-months", "this-quarter", "last-quarter", "this-year", "last-year", "all-time"
- topK: integer 1-20
- category: optional string
- merchantId: optional string

Return ONLY valid JSON: {"intent": "<one of the candidates>", "slots": {...}, "confidence": 0.85}

Examples:
Q: "top merchants last month?" Candidates: ["topMerchantsByCount"]
A: {"intent": "topMerchantsByCount", "slots": {"timeframe": "last-month", "topK": 5}, "confidence": 0.9}

Q: "luna trecuta cat am cheltuit" Candidates: ["totalSpend"]
A: {"intent": "totalSpend", "slots": {"timeframe": "last-month"}, "confidence": 0.95}`;

export function createSlotExtractorImpl(): SlotExtractorWorkerApi {
  return {
    ensureLoaded: async () => {
      if (engine) return;
      engine = new MLCEngine();
      await engine.reload(MODEL_ID);
    },
    extract: async ({question, candidateIntents}) => {
      if (!engine) throw new Error("Slot extractor model not loaded; call ensureLoaded first.");
      const reply = await engine.chat.completions.create({
        messages: [
          {role: "system", content: SYSTEM_PROMPT},
          {role: "user", content: `Question: "${question}"\nCandidates: ${JSON.stringify(candidateIntents)}\nReturn the JSON.`},
        ],
        response_format: {type: "json_object"},
        temperature: 0,
      });
      const raw = reply.choices[0]?.message?.content ?? "{}";
      let parsed: ExtractOutput;
      try {
        parsed = JSON.parse(raw) as ExtractOutput;
      } catch {
        throw new Error("Slot extractor produced invalid JSON.");
      }
      if (!candidateIntents.includes(parsed.intent)) {
        throw new Error(`Slot extractor returned intent "${parsed.intent}" not in candidates.`);
      }
      return parsed;
    },
    unload: async () => {
      if (engine) {
        await engine.unload();
        engine = null;
      }
    },
  };
}