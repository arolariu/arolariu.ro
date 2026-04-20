import type {Bucket} from "../types/status";

/**
 * Probe-weighted uptime percentage for a bucket sequence.
 *
 * Sums `healthy` and `total` across the input's probes, then returns
 * `healthy / total` rounded to 3 decimal places (supports "five-nines"
 * display precision, e.g. 99.999%). A bucket with 100 probes contributes
 * ten times more than a bucket with 10 probes — this matches the user
 * intuition of "how often were we reachable overall" rather than "what
 * fraction of time windows had a failure".
 *
 * Callers that want a different display precision should format at the
 * render site (e.g. `.toFixed(1)` for the worst-service sub-line).
 *
 * Invariant: returns exactly 100 when the denominator is 0 (no data yet,
 * or only zero-probe buckets). Callers that need a distinguishable
 * "unknown" sentinel should check `totalProbes` separately.
 */
export function weightedUptime(buckets: readonly Bucket[]): number {
  let healthy = 0;
  let total = 0;
  for (const b of buckets) {
    healthy += b.probes.healthy;
    total += b.probes.total;
  }
  if (total === 0) return 100;
  return Math.round((healthy / total) * 100_000) / 1000;
}
