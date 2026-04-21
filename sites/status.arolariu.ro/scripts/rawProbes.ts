import {existsSync, readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";
import type {ProbeResult} from "../src/lib/types/status";

/**
 * Reads all probe results from `<dataDir>/raw/*.jsonl`.
 *
 * Files are processed in sorted-filename order (daily jsonl files use
 * YYYY-MM-DD naming, so this is chronological). Blank lines are skipped;
 * malformed JSON lines are silently dropped so a torn write at the tail
 * of a file cannot break the consumer.
 *
 * Used by both `aggregate.ts` and `detectIncidents.ts` — must stay pure
 * (no side effects beyond the filesystem read).
 */
export function readRawProbes(dataDir: string): ProbeResult[] {
  const rawDir = join(dataDir, "raw");
  if (!existsSync(rawDir)) return [];
  const probes: ProbeResult[] = [];
  for (const f of readdirSync(rawDir).sort()) {
    if (!f.endsWith(".jsonl")) continue;
    const content = readFileSync(join(rawDir, f), "utf8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        probes.push(JSON.parse(line) as ProbeResult);
      } catch {
        // Malformed line — skip.
      }
    }
  }
  return probes;
}
