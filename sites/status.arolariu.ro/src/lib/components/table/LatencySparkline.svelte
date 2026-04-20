<script lang="ts">
  /**
   * LatencySparkline
   * ----------------
   * Compact inline SVG polyline of per-bucket p50 latency, sized to fit the
   * table cell via `preserveAspectRatio="none"`. Color is driven by the tier
   * of the most recent bucket (fast / ok / slow) and the line animates in
   * using an SVG stroke-dashoffset reveal. `aria-hidden` — this is a
   * decorative companion to the numeric latency column, not a primary signal.
   *
   * No interaction: hover/tooltip belongs to the adjacent UptimeBar.
   */
  import type {Bucket} from "../../types/status";
  import {latencyTier} from "../../aggregation/latencyTier";

  /** Props for the {@link LatencySparkline} component. */
  interface Props {
    /** Buckets for the currently-selected window. Rendered in chronological order. */
    buckets: readonly Bucket[];
    /** SVG viewBox width in arbitrary units (stretched to the cell). */
    width?: number;
    /** SVG viewBox height in arbitrary units (stretched to the cell). */
    height?: number;
  }

  let {buckets, width = 60, height = 16}: Props = $props();

  // Self-normalizing polyline: rescale y to each window's own [min, max] so
  // the shape stays readable regardless of absolute magnitude. The 5%/5% top
  // and bottom padding prevents the line from kissing the edges.
  const points = $derived.by(() => {
    if (buckets.length === 0) return "";
    const p50s = buckets.map(b => b.latency.p50);
    const max = Math.max(...p50s, 1);
    const min = Math.min(...p50s);
    const range = max - min || 1;
    return p50s.map((v, i) => {
      const x = (i / (buckets.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * height * 0.9 - height * 0.05;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  });

  // Tier is taken from the *last* bucket — the sparkline's color should
  // reflect current state, not aggregate behavior across the window.
  const tier = $derived.by(() => {
    const last = buckets[buckets.length - 1];
    return last === undefined ? "fast" : latencyTier(last.latency.p50);
  });

  // Rough polyline length estimate — summed Euclidean distance between
  // successive points parsed from the points string. Good enough to seed
  // stroke-dasharray / stroke-dashoffset so the path draws from start to end;
  // we don't need sub-pixel accuracy for the dashoffset animation to look right.
  const pathLength = $derived.by(() => {
    if (!points) return 0;
    const coords = points.split(" ").map(pair => {
      const parts = pair.split(",");
      return {x: Number(parts[0] ?? 0), y: Number(parts[1] ?? 0)};
    });
    let len = 0;
    for (let i = 1; i < coords.length; i++) {
      const cur = coords[i]!;
      const prev = coords[i - 1]!;
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      len += Math.hypot(dx, dy);
    }
    // Small nudge so paths with length 0 still trigger the animation safely.
    return Math.max(len, 1);
  });
</script>

<svg class="sparkline" viewBox="0 0 {width} {height}" preserveAspectRatio="none" aria-hidden="true">
  {#if points}
    {#key buckets}
      <polyline
        class="path tier-{tier}"
        fill="none"
        stroke-width="1.2"
        points={points}
        style="stroke-dasharray: {pathLength}; stroke-dashoffset: {pathLength};"
      />
    {/key}
  {/if}
</svg>

<style>
  .sparkline {
    width: 100%;
    height: 100%;
    display: block;
  }
  .path.tier-fast { stroke: var(--status-up); }
  .path.tier-ok   { stroke: var(--text-muted); }
  .path.tier-slow { stroke: var(--status-deg); }
  .path {
    animation: drawPath 300ms ease-out forwards;
  }
  @keyframes drawPath {
    to { stroke-dashoffset: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .path {
      animation: none;
      stroke-dashoffset: 0 !important;
    }
  }
</style>
