<script lang="ts">
  import type {Bucket} from "../types/status";

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

  const p50Max = $derived(Math.max(...buckets.map(b => b.latency.p50), 100));
  const p99Max = $derived(Math.max(...buckets.map(b => b.latency.p99), 200));
  const yMax = $derived(Math.max(p99Max, p50Max * 2, 200));

  function xFor(i: number): number {
    return PAD_L + (buckets.length === 1 ? INNER_W / 2 : (i / (buckets.length - 1)) * INNER_W);
  }
  function yFor(v: number): number {
    return PAD_T + INNER_H - (v / yMax) * INNER_H;
  }

  const p50Points = $derived(buckets.map((b, i) => `${xFor(i).toFixed(1)},${yFor(b.latency.p50).toFixed(1)}`).join(" "));
  const p99Points = $derived(buckets.map((b, i) => `${xFor(i).toFixed(1)},${yFor(b.latency.p99).toFixed(1)}`).join(" "));
  const p99Polygon = $derived.by(() => {
    if (buckets.length === 0) return "";
    const top = p99Points;
    const bottomRight = `${xFor(buckets.length - 1).toFixed(1)},${(PAD_T + INNER_H).toFixed(1)}`;
    const bottomLeft = `${xFor(0).toFixed(1)},${(PAD_T + INNER_H).toFixed(1)}`;
    return `${top} ${bottomRight} ${bottomLeft}`;
  });

  let hovered = $state<{i: number; x: number; y50: number; y99: number; bucket: Bucket} | null>(null);
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
    return `Latency trend for ${service} across ${buckets.length} buckets. p50 ranges ${Math.min(...p50s)}-${Math.max(...p50s)}ms. p99 peaks at ${Math.max(...p99s)}ms.`;
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
    <!-- p99 envelope -->
    {#if p99Polygon}
      <polygon fill="url(#p99-env-{service})" points={p99Polygon}/>
    {/if}
    <!-- p99 line -->
    {#if p99Points}
      <polyline class="p99" fill="none" stroke-width="1.3" points={p99Points}/>
    {/if}
    <!-- p50 line -->
    {#if p50Points}
      <polyline class="p50" fill="none" stroke-width="1.6" points={p50Points}/>
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
      <span class="row-h"><span class="swatch p50"></span>p50 {hovered.bucket.latency.p50} ms</span>
      <span class="row-h"><span class="swatch p99"></span>p99 {hovered.bucket.latency.p99} ms</span>
    </div>
  {/if}
  <div class="legend">
    <span><span class="swatch p50"></span>p50 · median</span>
    <span><span class="swatch p99"></span>p99 · tail</span>
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
</style>
