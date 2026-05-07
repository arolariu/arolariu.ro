/**
 * @fileoverview Build-time embeddings generator for the invoice AI assistant.
 * @module scripts/generate.embeddings
 *
 * @remarks
 * Loads multilingual-e5-small via Transformers.js, encodes all 300 seed
 * phrases (10 intents x 10 phrasings x 3 locales) with `query: ` prefix +
 * mean-pool + L2-normalize, and writes the matrix to:
 *   sites/arolariu.ro/src/app/domains/invoices/_components/ai/workers/seedEmbeddings.json
 *
 * First run downloads the 118 MB model into the Transformers.js cache.
 * Re-run whenever seedPhrases.{en,ro,fr}.ts changes.
 *
 * Manual: node scripts/generate.embeddings.ts
 */

import {pipeline} from "@huggingface/transformers";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {SEED_PHRASES_EN} from "../sites/arolariu.ro/src/app/domains/invoices/_components/ai/intents/seedPhrases.en.ts";
import {SEED_PHRASES_RO} from "../sites/arolariu.ro/src/app/domains/invoices/_components/ai/intents/seedPhrases.ro.ts";
import {SEED_PHRASES_FR} from "../sites/arolariu.ro/src/app/domains/invoices/_components/ai/intents/seedPhrases.fr.ts";

type Locale = "en" | "ro" | "fr";

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractor: any = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");
  const allLocales: Array<[Locale, typeof SEED_PHRASES_EN]> = [
    ["en", SEED_PHRASES_EN],
    ["ro", SEED_PHRASES_RO],
    ["fr", SEED_PHRASES_FR],
  ];
  const rows: Array<{locale: Locale; intent: string; phrase: string; embedding: number[]}> = [];
  for (const [locale, phrases] of allLocales) {
    for (const intent of Object.keys(phrases)) {
      for (const phrase of phrases[intent as keyof typeof phrases]) {
        const out = await extractor(`query: ${phrase}`, {pooling: "mean", normalize: true});
        rows.push({locale, intent, phrase, embedding: Array.from(out.data as Float32Array)});
      }
    }
  }
  const target = path.join(
    "sites/arolariu.ro/src/app/domains/invoices/_components/ai/workers/seedEmbeddings.json",
  );
  await fs.writeFile(target, JSON.stringify(rows, null, 0), "utf8");
  console.log(`Wrote ${rows.length} embeddings to ${target}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});