/**
 * @fileoverview Embedding-worker implementation (Layer 1, multilingual-e5-small).
 * @module app/domains/invoices/_components/ai/workers/embedding.implementation
 *
 * @remarks
 * Reads the precomputed seedEmbeddings.json matrix at module load; encodes
 * the user's question on each classify() call and returns the top-N intents
 * by cosine similarity over the locale-filtered seed rows.
 *
 * Uses `@huggingface/transformers` v4 (the official rename of the legacy
 * `@xenova/transformers` package) which works cleanly under Turbopack's
 * worker bundler without Node-builtin polyfills. Loaded via dynamic import
 * inside ensureLoaded() so any future package-init crash surfaces as
 * `embedding-failed` state rather than a hard module-eval throw.
 */

import seedRows from "./seedEmbeddings.json";
import type {EmbeddingWorkerApi, ClassifyOutput} from "./embedding.api";
import type {AssistantLocale} from "../types";

type SeedRow = {locale: AssistantLocale; intent: string; phrase: string; embedding: number[]};

type ExtractorFn = (text: string, opts: {pooling: string; normalize: boolean}) => Promise<{data: Float32Array}>;

let extractor: ExtractorFn | null = null;

function cosineSim(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  let dot = 0;
  let aSq = 0;
  let bSq = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    aSq += a[i]! * a[i]!;
    bSq += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(aSq) * Math.sqrt(bSq);
  return denom === 0 ? 0 : dot / denom;
}

export function createEmbeddingImpl(): EmbeddingWorkerApi {
  return {
    ensureLoaded: async (): Promise<void> => {
      if (extractor) return;
      const transformers = (await import("@huggingface/transformers")) as {
        pipeline: (task: string, model: string) => Promise<unknown>;
      };
      extractor = (await transformers.pipeline("feature-extraction", "Xenova/multilingual-e5-small")) as ExtractorFn;
    },
    classify: async ({question, locale}): Promise<ClassifyOutput> => {
      if (!extractor) throw new Error("Embedding model not loaded; call ensureLoaded first.");
      const out = await extractor(`query: ${question}`, {pooling: "mean", normalize: true});
      const qVec = Array.from(out.data);
      const localeRows = (seedRows as SeedRow[]).filter((r) => r.locale === locale);
      const scoresByIntent = new Map<string, number>();
      for (const row of localeRows) {
        const sim = cosineSim(qVec, row.embedding);
        const cur = scoresByIntent.get(row.intent) ?? -1;
        if (sim > cur) scoresByIntent.set(row.intent, sim);
      }
      const ranked = Array.from(scoresByIntent.entries())
        .map(([intent, score]) => ({intent, score}))
        .sort((a, b) => b.score - a.score);
      const top = ranked[0] ?? {intent: "totalSpend", score: 0};
      return {topIntent: top.intent, topScore: top.score, candidates: ranked.slice(0, 3)};
    },
  };
}