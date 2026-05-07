/**
 * @fileoverview Slot-extractor worker (Layer 2) public API contract.
 * @module app/domains/invoices/_components/ai/workers/slotExtractor.api
 */

import type {AssistantLocale} from "../types";

export type ExtractInput = Readonly<{
  question: string;
  locale: AssistantLocale;
  candidateIntents: ReadonlyArray<string>;
}>;

export type ExtractOutput = Readonly<{
  intent: string;
  slots: Record<string, unknown>;
  confidence: number;
}>;

export type SlotExtractorWorkerApi = Readonly<{
  ensureLoaded: () => Promise<void>;
  extract: (input: ExtractInput) => Promise<ExtractOutput>;
  unload: () => Promise<void>;
}>;