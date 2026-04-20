<script lang="ts">
  /**
   * UptimeBar
   * ---------
   * Dense horizontal strip of flex-sized segments, one per visible bucket,
   * colored by {@link HealthStatus} (up / degraded / down). The bar is the
   * primary visualization of service health across the window.
   *
   * **Responsive downsampling.** A ResizeObserver tracks container width
   * and derives `maxSegments = floor(containerWidth / segmentTargetPx)`.
   * When there are more buckets than segments, consecutive chunks are
   * merged via {@link mergeBuckets} (worst-wins status, summed probes,
   * averaged latency). Merged buckets carry `spanMs` so the tooltip can
   * show the true end-of-range rather than a single-bucket duration.
   *
   * **Interaction.** Each segment is a focusable `<button>` with an aria
   * label describing the time, status, and worst sub-check. Mouse and
   * keyboard focus both emit `onSegmentHover`, driving the route-level
   * SegmentTooltip.
   */
  import {onMount} from "svelte";
  import type {Bucket, HealthStatus} from "../../types/status";

  /** Props for the {@link UptimeBar} component. */
  interface Props {
    /** Windowed buckets in chronological order. */
    buckets: readonly Bucket[];
    /** `primary` (regular height) or `sub` (reduced height + faded opacity) — used inside ServiceDetailPanel. */
    variant?: "primary" | "sub";
    /** Fired on mouseenter/focus (with the bucket + target) and mouseleave/blur (with nulls). */
    onSegmentHover: (bucket: Bucket | null, target: HTMLElement | null) => void;
    /** Stable id of the shared tooltip element for `aria-describedby`. */
    tooltipId?: string | undefined;
    /** Timestamp of the currently-hovered bucket — used to gate `aria-describedby` to just the active segment. */
    hoveredBucketT?: string | null;
    /**
     * Base bucket duration (ms). When the bar downsamples (merges) buckets to
     * fit available width, the merged bucket carries `spanMs = chunk.length *
     * bucketDurationMs` so the tooltip can render the real end-of-range.
     */
    bucketDurationMs?: number | undefined;
  }

  let {buckets, variant = "primary", onSegmentHover, tooltipId, hoveredBucketT = null, bucketDurationMs}: Props = $props();

  const STATUS_ORDER: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};

  let barEl: HTMLDivElement;
  let containerWidth = $state(900); // sensible initial so SSR isn't empty

  onMount(() => {
    if (typeof ResizeObserver === "undefined" || !barEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          containerWidth = w;
        }
      }
    });
    ro.observe(barEl);
    return () => ro.disconnect();
  });

  // Segment target width in px lives in a CSS custom property so theme
  // tweaks can re-tune segment density without touching TS. SSR fallback
  // 6px keeps the shape reasonable when there's no document yet.
  const targetPx = $derived.by(() => {
    if (typeof document === "undefined") return 6;
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--segment-target-px").trim();
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 6;
  });

  // Floor 12 segments so very narrow containers still show a readable strip.
  const maxSegments = $derived(Math.max(12, Math.floor(containerWidth / Math.max(3, targetPx))));

  function mergeBuckets(chunk: readonly Bucket[], baseDurationMs: number | undefined): Bucket {
    // Caller (downsample) never passes an empty chunk — slice(i, i + chunkSize)
    // on a non-empty input always yields at least one element. Non-null
    // assertion pins the invariant for noUncheckedIndexedAccess.
    const first = chunk[0]!;
    const worst = chunk.reduce<Bucket>((w, b) => STATUS_ORDER[b.status] > STATUS_ORDER[w.status] ? b : w, first);
    const healthy = chunk.reduce((s, b) => s + b.probes.healthy, 0);
    const total = chunk.reduce((s, b) => s + b.probes.total, 0);
    const avgP50 = Math.round(chunk.reduce((s, b) => s + b.latency.p50, 0) / chunk.length);
    const avgP99 = Math.round(chunk.reduce((s, b) => s + b.latency.p99, 0) / chunk.length);
    const merged: Bucket = {
      t: first.t,
      status: worst.status,
      probes: {healthy, total},
      latency: {p50: avgP50, p99: avgP99},
      ...(worst.httpStatus !== undefined && {httpStatus: worst.httpStatus}),
      ...(worst.worstSubCheck !== undefined && {worstSubCheck: worst.worstSubCheck}),
      ...(baseDurationMs !== undefined && {spanMs: chunk.length * baseDurationMs}),
    };
    return merged;
  }

  function downsample(input: readonly Bucket[], limit: number, baseDurationMs: number | undefined): readonly Bucket[] {
    if (input.length <= limit) return input;
    const chunkSize = Math.ceil(input.length / limit);
    const out: Bucket[] = [];
    for (let i = 0; i < input.length; i += chunkSize) {
      out.push(mergeBuckets(input.slice(i, i + chunkSize), baseDurationMs));
    }
    return out;
  }

  const visibleBuckets = $derived(downsample(buckets, maxSegments, bucketDurationMs));

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

<div class="bar" data-variant={variant} bind:this={barEl}>
  {#each visibleBuckets as bucket, i (bucket.t)}
    <button
      type="button"
      class="seg seg-{bucket.status.toLowerCase()}"
      style="--idx: {i};"
      aria-label={buildAriaLabel(bucket)}
      aria-describedby={tooltipId && hoveredBucketT === bucket.t ? tooltipId : undefined}
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
    transition: transform .12s, filter .12s;
    animation: segStaggerIn 120ms ease-out backwards;
    animation-delay: calc(min(var(--idx, 0) * 3ms, 180ms));
  }
  @keyframes segStaggerIn {
    from { opacity: 0; transform: translateY(2px); }
    to   { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .seg { animation: none; }
  }
  .seg:hover, .seg:focus-visible {
    transform: scaleY(1.15);
    filter: brightness(1.15);
    outline: none;
    z-index: 1;
  }
  .seg-healthy { background: var(--status-up); }
  .seg-degraded { background: var(--status-deg); }
  .seg-unhealthy { background: var(--status-down); }
  .bar[data-variant="sub"] .seg-healthy { opacity: 0.75; }
</style>
