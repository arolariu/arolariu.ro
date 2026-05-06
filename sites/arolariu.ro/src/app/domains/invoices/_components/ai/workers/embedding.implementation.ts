/**
 * @fileoverview Embedding-worker implementation (Layer 1, multilingual-e5-small).
 * @module app/domains/invoices/_components/ai/workers/embedding.implementation
 *
 * @remarks
 * Reads the precomputed seedEmbeddings.json matrix at module load; encodes
 * the user's question on each classify() call and returns the top-N intents
 * by cosine similarity over the locale-filtered seed rows.
 */

import {pipeline, type FeatureExtractionPipeline} from "@xenova/transformers";
import seedRows from "./seedEmbeddings.json";
import type {EmbeddingWorkerApi, ClassifyOutput} from "./embedding.api";
import type {AssistantLocale} from "../types";

type SeedRow = {locale: AssistantLocale; intent: string; phrase: string; embedding: number[]};

let extractor: FeatureExtractionPipeline | null = null;

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
      extractor = (await pipeline("feature-extraction", "Xenova/multilingual-e5-small")) as FeatureExtractionPipeline;
    },
    classify: async ({question, locale}): Promise<ClassifyOutput> => {
      if (!extractor) throw new Error("Embedding model not loaded; call ensureLoaded first.");
      const out = await extractor(`query: ${question}`, {pooling: "mean", normalize: true});
      const qVec = Array.from(out.data as Float32Array);
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