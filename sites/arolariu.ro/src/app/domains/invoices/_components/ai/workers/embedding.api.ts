/**
 * @fileoverview Embedding-worker (Layer 1) public API contract.
 * @module app/domains/invoices/_components/ai/workers/embedding.api
 */

import type {AssistantLocale} from "../types";

export type ClassifyOutput = Readonly<{
  topIntent: string;
  topScore: number;
  candidates: ReadonlyArray<{intent: string; score: number}>;
}>;

export type EmbeddingWorkerApi = Readonly<{
  ensureLoaded: () => Promise<void>;
  classify: (input: Readonly<{question: string; locale: AssistantLocale}>) => Promise<ClassifyOutput>;
}>;