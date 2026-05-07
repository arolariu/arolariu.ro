/**
 * @fileoverview Calibration tool for the embedding-classifier confidence thresholds.
 * @module scripts/calibrate-assistant-embeddings
 *
 * @remarks
 * Reports intra-class vs inter-class cosine similarity distribution
 * across all 300 seed phrases. Recommends confidence thresholds.
 *
 * Manual: node scripts/calibrate-assistant-embeddings.ts
 */

import seedRows from "../sites/arolariu.ro/src/app/domains/invoices/_components/ai/workers/seedEmbeddings.json" with {type: "json"};

type Row = {locale: string; intent: string; phrase: string; embedding: number[]};

function cosineSim(a: number[], b: number[]): number {
  let d = 0;
  let aa = 0;
  let bb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    d += a[i]! * b[i]!;
    aa += a[i]! * a[i]!;
    bb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  return denom === 0 ? 0 : d / denom;
}

const rows = seedRows as Row[];
const intra: number[] = [];
const inter: number[] = [];

for (const a of rows) {
  for (const b of rows) {
    if (a === b) continue;
    if (a.locale !== b.locale) continue;
    const s = cosineSim(a.embedding, b.embedding);
    (a.intent === b.intent ? intra : inter).push(s);
  }
}

function stats(arr: number[]): {mean: number; min: number; max: number; p10: number; p90: number} {
  if (arr.length === 0) return {mean: 0, min: 0, max: 0, p10: 0, p90: 0};
  const sorted = [...arr].sort((x, y) => x - y);
  return {
    mean: sorted.reduce((s, x) => s + x, 0) / sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p10: sorted[Math.floor(sorted.length * 0.1)]!,
    p90: sorted[Math.floor(sorted.length * 0.9)]!,
  };
}

const intraStats = stats(intra);
const interStats = stats(inter);

console.log("=== Calibration Report ===");
console.log(`Seed rows: ${rows.length} (across locales).`);
console.log(`Intra-class pairs: ${intra.length}`);
console.log(`Inter-class pairs: ${inter.length}`);
console.log("");
console.log("Intra-class (same intent, same locale):", intraStats);
console.log("Inter-class (different intent, same locale):", interStats);
console.log("");
console.log("Recommended thresholds:");
console.log(`  canonical (>=): ${intraStats.p10.toFixed(2)} (10th percentile of intra-class)`);
console.log(`  uncertain (>=): ${interStats.p90.toFixed(2)} (90th percentile of inter-class)`);
console.log("");
console.log("Update CONFIDENCE_THRESHOLDS in types.ts accordingly.");