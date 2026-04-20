<script lang="ts">
  import type {Bucket, HealthStatus} from "../types/status";

  interface Props {
    buckets: readonly Bucket[];
    variant?: "primary" | "sub";
    onSegmentHover: (bucket: Bucket | null, target: HTMLElement | null) => void;
    maxSegments?: number;
  }

  let {buckets, variant = "primary", onSegmentHover, maxSegments = 180}: Props = $props();

  const STATUS_ORDER: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};

  /**
   * Merges an array of buckets into a single bucket whose status is the worst
   * of the group, probes are summed, and latencies are averaged. Preserves
   * worstSubCheck from whichever child had the worst status.
   */
  function mergeBuckets(chunk: readonly Bucket[]): Bucket {
    const worst = chunk.reduce((w, b) => STATUS_ORDER[b.status] > STATUS_ORDER[w.status] ? b : w, chunk[0]);
    const healthy = chunk.reduce((s, b) => s + b.probes.healthy, 0);
    const total = chunk.reduce((s, b) => s + b.probes.total, 0);
    const avgP50 = Math.round(chunk.reduce((s, b) => s + b.latency.p50, 0) / chunk.length);
    const avgP99 = Math.round(chunk.reduce((s, b) => s + b.latency.p99, 0) / chunk.length);
    const merged: Bucket = {
      t: chunk[0].t,
      status: worst.status,
      probes: {healthy, total},
      latency: {p50: avgP50, p99: avgP99},
    };
    if (worst.httpStatus !== undefined) (merged as Record<string, unknown>)["httpStatus"] = worst.httpStatus;
    if (worst.worstSubCheck !== undefined) (merged as Record<string, unknown>)["worstSubCheck"] = worst.worstSubCheck;
    return merged;
  }

  /**
   * Cap visible segments at maxSegments by chunking adjacent buckets. Keeps
   * the timeline end-aligned on "now" — the last chunk may be smaller than
   * earlier chunks so the rightmost segment always represents the most
   * recent data.
   */
  function downsample(input: readonly Bucket[], limit: number): readonly Bucket[] {
    if (input.length <= limit) return input;
    const chunkSize = Math.ceil(input.length / limit);
    const out: Bucket[] = [];
    for (let i = 0; i < input.length; i += chunkSize) {
      out.push(mergeBuckets(input.slice(i, i + chunkSize)));
    }
    return out;
  }

  const visibleBuckets = $derived(downsample(buckets, maxSegments));

  function buildAriaLabel(b: Bucket): string {
    const date = new Date(b.t);
    const timeStr = date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const sub = b.worstSubCheck ? `, ${b.worstSubCheck.name} ${b.worstSubCheck.description ?? ""}` : "";
    return `${timeStr}, ${b.status}${sub}`;
  }

  function handleEnter(bucket: Bucket, event: Event) {
    onSegmentHover(bucket, event.currentTarget as HTMLElement);
  }

  function handleLeave() {
    onSegmentHover(null, null);
  }
</script>

<div class="bar" data-variant={variant}>
  {#each visibleBuckets as bucket (bucket.t)}
    <button
      type="button"
      class="seg seg-{bucket.status.toLowerCase()}"
      aria-label={buildAriaLabel(bucket)}
      onmouseenter={(e) => handleEnter(bucket, e)}
      onmouseleave={handleLeave}
      onfocus={(e) => handleEnter(bucket, e)}
      onblur={handleLeave}
    ></button>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    gap: 1px;
    height: 24px;
    align-items: stretch;
    position: relative;
    width: 100%;
    min-width: 0;
  }
  .bar[data-variant="sub"] { height: 16px; }
  .seg {
    flex: 1 1 0;
    min-width: 0;
    border: 0;
    padding: 0;
    border-radius: 1px;
    cursor: pointer;
    transition: transform .12s;
  }
  .seg:hover, .seg:focus-visible {
    transform: scaleY(1.15);
    outline: none;
  }
  .seg-healthy { background: var(--status-up); }
  .seg-degraded { background: var(--status-deg); }
  .seg-unhealthy { background: var(--status-down); }
  .bar[data-variant="sub"] .seg-healthy { opacity: 0.75; }
</style>
