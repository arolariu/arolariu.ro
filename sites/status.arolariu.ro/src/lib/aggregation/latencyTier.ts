/**
 * Shared latency-tier classification. Four components (AvgLatencyCard,
 * ServiceRow, SubServiceRow, LatencySparkline) used to inline the same
 * `p50 < 200 ? "fast" : p50 < 500 ? "ok" : "slow"` ternary — each a drift
 * risk if the thresholds ever changed. Centralize here.
 */

export type LatencyTier = "fast" | "ok" | "slow";

/**
 * Tier boundaries (exclusive upper). A p50 of exactly 200 is already "ok";
 * exactly 500 is already "slow". Tests cover the boundary case explicitly.
 */
export const LATENCY_THRESHOLDS = {fast: 200, ok: 500} as const;

/** Classify a p50 latency value into its visual tier. */
export function latencyTier(p50: number): LatencyTier {
  if (p50 < LATENCY_THRESHOLDS.fast) return "fast";
  if (p50 < LATENCY_THRESHOLDS.ok) return "ok";
  return "slow";
}
