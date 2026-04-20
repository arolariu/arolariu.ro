import type {Bucket} from "../types/status";
import {weightedUptime} from "./weightedUptime";

/**
 * Thin alias for `weightedUptime` at the row level. Exists so call sites can
 * read `computeUptime(service.buckets)` (the natural reading) rather than
 * import the more implementation-flavoured `weightedUptime` symbol.
 *
 * See `weightedUptime` for the actual math (probe-weighted, 3-decimal precision).
 */
export function computeUptime(buckets: readonly Bucket[]): number {
  return weightedUptime(buckets);
}
