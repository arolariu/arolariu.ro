<script lang="ts">
  import type {Bucket} from "../../types/status";

  interface Props {
    buckets: readonly Bucket[];
    service: string;
    bucketDurationMs: number;
  }

  let {buckets, service, bucketDurationMs}: Props = $props();

  const CHART_W = 500;
  const CHART_H = 140;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 22;
  const INNER_W = CHART_W - PAD_L - PAD_R;
  const INNER_H = CHART_H - PAD_T - PAD_B;

  // True when every bucket in the window carries p75 AND p95. When any bucket
  // is missing either, we can't draw a continuous fan — fall back to the
  // degraded (p50 line + p99 envelope) look that was in place before.
  const hasFan = $derived(
    buckets.length > 0 && buckets.every(b =>
      b.latency.p75 !== undefined && b.latency.p95 !== undefined
    )
  );

  const p50Max = $derived(Math.max(...buckets.map(b => b.latency.p50), 100));
  const p99Max = $derived(Math.max(...buckets.map(b => b.latency.p99), 200));
  const yMax = $derived(Math.max(p99Max, p50Max * 2, 200));

  function xFor(i: number): number {
    return PAD_L + (buckets.length === 1 ? INNER_W / 2 : (i / (buckets.length - 1)) * INNER_W);
  }
  function yFor(v: number): number {
    return PAD_T + INNER_H - (v / yMax) * INNER_H;
  }

  /** Build a polyline point string for a given percentile extractor. */
  function linePoints(pick: (b: Bucket) => number): string {
    return buckets.map((b, i) => `${xFor(i).toFixed(1)},${yFor(pick(b)).toFixed(1)}`).join(" ");
  }

  /** Build a polygon point string for a band between two percentile lines. */
  function bandPoints(upper: (b: Bucket) => number, lower: (b: Bucket) => number): string {
    if (buckets.length === 0) return "";
    const topFwd = buckets.map((b, i) => `${xFor(i).toFixed(1)},${yFor(upper(b)).toFixed(1)}`);
    const bottomRev = buckets.map((b, i) => `${xFor(i).toFixed(1)},${yFor(lower(b)).toFixed(1)}`).reverse();
    return [...topFwd, ...bottomRev].join(" ");
  }

  const p50Points = $derived(linePoints(b => b.latency.p50));
  const p99Points = $derived(linePoints(b => b.latency.p99));
  // Fan polygons (only valid when hasFan is true). Back-to-front order so the
  // darkest (innermost) band paints last and stays visually in front.
  const outerBandPoints = $derived(hasFan ? bandPoints(b => b.latency.p95 as number, b => b.latency.p99) : "");
  const middleBandPoints = $derived(hasFan ? bandPoints(b => b.latency.p75 as number, b => b.latency.p95 as number) : "");
  const innerBandPoints = $derived(hasFan ? bandPoints(b => b.latency.p50, b => b.latency.p75 as number) : "");

  // Degraded-mode polygon (old style): p50 line + p99 envelope down to the x-axis.
  const p99Polygon = $derived.by(() => {
    if (hasFan || buckets.length === 0) return "";
    const top = p99Points;
    const bottomRight = `${xFor(buckets.length - 1).toFixed(1)},${(PAD_T + INNER_H).toFixed(1)}`;
    const bottomLeft = `${xFor(0).toFixed(1)},${(PAD_T + INNER_H).toFixed(1)}`;
    return `${top} ${bottomRight} ${bottomLeft}`;
  });

  let hovered = $state<{
    i: number; x: number; y50: number; y99: number; bucket: Bucket;
  } | null>(null);
  let svgEl = $state<SVGSVGElement | null>(null);

  function onPointerMove(e: PointerEvent) {
    if (!svgEl || buckets.length === 0) return;
    const rect = svgEl.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * CHART_W;
    if (xPx < PAD_L || xPx > CHART_W - PAD_R) { hovered = null; return; }
    const i = Math.round(((xPx - PAD_L) / INNER_W) * (buckets.length - 1));
    const clamped = Math.max(0, Math.min(buckets.length - 1, i));
    const b = buckets[clamped];
    hovered = {i: clamped, x: xFor(clamped), y50: yFor(b.latency.p50), y99: yFor(b.latency.p99), bucket: b};
  }
  function onPointerLeave() { hovered = null; }

  function formatAxisLabel(v: number): string {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}s`;
    return `${Math.round(v)}ms`;
  }

  function formatTooltipTime(iso: string): string {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  }

  const desc = $derived.by(() => {
    if (buckets.length === 0) return `Latency trend for ${service}: no data.`;
    const p50s = buckets.map(b => b.latency.p50);
    const p99s = buckets.map(b => b.latency.p99);
    const p50Range = `${Math.min(...p50s)}-${Math.max(...p50s)}ms`;
    const p99Peak = `${Math.max(...p99s)}ms`;
    if (hasFan) {
      const p75s = buckets.map(b => b.latency.p75 as number);
      const p95s = buckets.map(b => b.latency.p95 as number);
      return `Latency trend for ${service} across ${buckets.length} buckets: p50 ${p50Range}, p75 peaks at ${Math.max(...p75s)}ms, p95 peaks at ${Math.max(...p95s)}ms, p99 peaks at ${p99Peak}.`;
    }
    return `Latency trend for ${service} across ${buckets.length} buckets. p50 ranges ${p50Range}. p99 peaks at ${p99Peak}.`;
  });
</script>

<div class="chart-wrap">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {CHART_W} {CHART_H}"
    preserveAspectRatio="none"
    class="chart"
    onpointermove={onPointerMove}
    onpointerleave={onPointerLeave}
    role="img"
    aria-label="Latency trend chart"
  >
    <desc>{desc}</desc>
    <defs>
      <linearGradient id="p99-env-{service}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--status-deg)" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="var(--status-deg)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- grid -->
    <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + INNER_H} stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
    <line x1={PAD_L} y1={PAD_T + INNER_H} x2={CHART_W - PAD_R} y2={PAD_T + INNER_H} stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
    {#each [0.25, 0.5, 0.75] as frac}
      <line x1={PAD_L} y1={PAD_T + INNER_H * frac} x2={CHART_W - PAD_R} y2={PAD_T + INNER_H * frac} stroke="currentColor" stroke-width="0.5" opacity="0.05" stroke-dasharray="2 4"/>
    {/each}
    <!-- y-axis labels -->
    <text x={PAD_L - 4} y={PAD_T + 4} text-anchor="end" class="axis-label">{formatAxisLabel(yMax)}</text>
    <text x={PAD_L - 4} y={PAD_T + INNER_H * 0.5 + 3} text-anchor="end" class="axis-label">{formatAxisLabel(yMax * 0.5)}</text>
    <text x={PAD_L - 4} y={PAD_T + INNER_H + 3} text-anchor="end" class="axis-label">0</text>

    {#if hasFan}
      <!-- percentile fan: outer (p95↔p99), middle (p75↔p95), inner (p50↔p75).
           Back-to-front: lightest first, so inner (darkest) sits visually in
           front. All three share the service latency accent (var(--status-up)),
           varying alpha only — colorblind-safe via the legend + centerline. -->
      {#if outerBandPoints}
        <polygon class="band band-outer" points={outerBandPoints}/>
      {/if}
      {#if middleBandPoints}
        <polygon class="band band-middle" points={middleBandPoints}/>
      {/if}
      {#if innerBandPoints}
        <polygon class="band band-inner" points={innerBandPoints}/>
      {/if}
    {:else}
      <!-- degraded fallback: p99 envelope (old look) when any bucket
           lacks p75/p95 (pre-upgrade aggregate data). -->
      {#if p99Polygon}
        <polygon fill="url(#p99-env-{service})" points={p99Polygon}/>
      {/if}
      {#if p99Points}
        <polyline class="p99" fill="none" stroke-width="1.3" points={p99Points}/>
      {/if}
    {/if}

    <!-- p50 centerline sits on top of everything -->
    {#if p50Points}
      <polyline class="p50" fill="none" stroke-width="1.5" points={p50Points}/>
    {/if}

    <!-- hover crosshair -->
    {#if hovered}
      <line x1={hovered.x} y1={PAD_T} x2={hovered.x} y2={PAD_T + INNER_H} stroke="currentColor" stroke-width="0.8" opacity="0.4" stroke-dasharray="2 2"/>
      <circle cx={hovered.x} cy={hovered.y99} r="3" class="dot-p99"/>
      <circle cx={hovered.x} cy={hovered.y50} r="3" class="dot-p50"/>
    {/if}
  </svg>
  {#if hovered}
    <div class="crosshair-label" style="left: {(hovered.x / CHART_W) * 100}%;">
      <strong>{formatTooltipTime(hovered.bucket.t)}</strong>
      <dl class="xh-pcts">
        <div class="xh-row xh-emph">
          <dt>p50</dt><dd>{hovered.bucket.latency.p50} ms</dd>
        </div>
        <div class="xh-row xh-mid">
          <dt>p75</dt><dd>{hovered.bucket.latency.p75 !== undefined ? `${hovered.bucket.latency.p75} ms` : "—"}</dd>
        </div>
        <div class="xh-row xh-mid">
          <dt>p95</dt><dd>{hovered.bucket.latency.p95 !== undefined ? `${hovered.bucket.latency.p95} ms` : "—"}</dd>
        </div>
        <div class="xh-row xh-emph">
          <dt>p99</dt><dd>{hovered.bucket.latency.p99} ms</dd>
        </div>
      </dl>
    </div>
  {/if}
  <div class="legend">
    {#if hasFan}
      <span><span class="swatch p50"></span>p50</span>
      <span><span class="swatch band-sw-inner"></span>p75</span>
      <span><span class="swatch band-sw-middle"></span>p95</span>
      <span><span class="swatch band-sw-outer"></span>p99</span>
    {:else}
      <span><span class="swatch p50"></span>p50 · median</span>
      <span><span class="swatch p99"></span>p99 · tail</span>
    {/if}
    <span class="legend-hint">{buckets.length} buckets · {Math.round(bucketDurationMs / 60_000)} min each</span>
  </div>
</div>

<style>
  .chart-wrap {
    position: relative;
    width: 100%;
  }
  .chart {
    width: 100%;
    height: auto;
    aspect-ratio: 500 / 140;
    color: var(--text);
    cursor: crosshair;
  }
  .p50 { stroke: var(--status-up); }
  .p99 { stroke: var(--status-deg); }
  /* Percentile fan bands — alpha varied on the latency accent.
     Outer (p95→p99) lightest; middle (p75→p95) medium; inner (p50→p75) darkest.
     Stroke is a hairline of the same tone so the band edge is readable without
     relying on color alone (legend + p50 centerline remain the primary signal). */
  .band { stroke: var(--status-up); stroke-width: 0.3; fill: var(--status-up); }
  .band-outer  { fill-opacity: 0.12; stroke-opacity: 0.25; }
  .band-middle { fill-opacity: 0.22; stroke-opacity: 0.35; }
  .band-inner  { fill-opacity: 0.35; stroke-opacity: 0.45; }

  .dot-p50 { fill: var(--status-up); stroke: var(--bg); stroke-width: 1; }
  .dot-p99 { fill: var(--status-deg); stroke: var(--bg); stroke-width: 1; }
  .axis-label {
    font-size: 9px;
    fill: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .legend {
    display: flex;
    gap: var(--sp-md);
    font-size: var(--fs-xs);
    color: var(--text-muted);
    margin-top: var(--sp-2xs);
    padding: 0 var(--sp-xs);
  }
  .legend-hint { margin-left: auto; opacity: 0.6; }
  .swatch {
    display: inline-block;
    width: 10px;
    height: 2px;
    vertical-align: middle;
    margin-right: 4px;
  }
  .swatch.p50 { background: var(--status-up); }
  .swatch.p99 { background: var(--status-deg); }
  .band-sw-outer,
  .band-sw-middle,
  .band-sw-inner {
    height: 8px;
    border-radius: 1px;
    background: var(--status-up);
  }
  .band-sw-outer  { opacity: 0.25; }
  .band-sw-middle { opacity: 0.45; }
  .band-sw-inner  { opacity: 0.65; }
  .crosshair-label {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: var(--sp-2xs) var(--sp-xs);
    font-size: 10px;
    pointer-events: none;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 5;
  }
  .crosshair-label strong { font-size: 10.5px; }
  .row-h { display: flex; align-items: center; }
  .xh-pcts {
    margin: 2px 0 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 8px;
    row-gap: 1px;
    font-variant-numeric: tabular-nums;
  }
  .xh-row {
    display: contents;
  }
  .xh-row dt { opacity: 0.55; }
  .xh-row dd { margin: 0; text-align: right; }
  .xh-emph dt, .xh-emph dd { opacity: 1; font-weight: 500; }
  .xh-mid dt { opacity: 0.55; }
  .xh-mid dd { opacity: 0.8; }
</style>
