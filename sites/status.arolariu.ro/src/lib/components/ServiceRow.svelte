<script lang="ts">
  import type {Bucket, ServiceSeries} from "../types/status";
  import {computeUptime, computeAvgLatency} from "../aggregation/computeUptime";
  import {deriveLatestStatus} from "../aggregation/deriveParentStatus";
  import UptimeBar from "./UptimeBar.svelte";
  import LatencySparkline from "./LatencySparkline.svelte";
  import ServiceDetailPanel from "./ServiceDetailPanel.svelte";

  interface Props {
    series: ServiceSeries;
    expanded: boolean;
    onToggle: () => void;
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
    tooltipId?: string;
    hoveredBucketT?: string | null;
    bucketDurationMs: number;
  }

  let {series, expanded, onToggle, onHover, tooltipId, hoveredBucketT = null, bucketDurationMs}: Props = $props();

  const latest = $derived(deriveLatestStatus(series));
  const uptime = $derived(computeUptime(series.buckets));
  const avgLatency = $derived(computeAvgLatency(series.buckets));
</script>

<div
  class="row"
  role="button"
  tabindex="0"
  aria-expanded={expanded}
  onclick={onToggle}
  onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
>
  <div class="name-col">
    <span class="dot dot-{latest.toLowerCase()}" class:pulse={latest !== "Healthy"}></span>
    <span class="name">{series.service}</span>
    <span class="caret" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
  </div>
  <div class="spark-cell"><LatencySparkline buckets={series.buckets} /></div>
  <div class="bar-cell"><UptimeBar buckets={series.buckets} onSegmentHover={onHover} {tooltipId} {hoveredBucketT} /></div>
  <div class="uptime">{uptime}%</div>
  <div class="latency" data-tier={avgLatency < 200 ? "fast" : avgLatency < 500 ? "ok" : "slow"}>{avgLatency} ms</div>
</div>

{#if expanded}
  <ServiceDetailPanel {series} {bucketDurationMs} {onHover} {tooltipId} {hoveredBucketT}/>
{/if}

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(8rem, 1.4fr) 70px minmax(0, 2fr) 6ch 7ch;
    grid-template-areas: "name sparkline bar uptime latency";
    gap: var(--sp-sm);
    align-items: center;
    padding: var(--sp-sm) var(--sp-md);
    border-bottom: 1px solid var(--border);
    font-size: var(--fs-body);
    cursor: pointer;
    transition: background .12s;
  }
  .row:hover { background: rgba(255,255,255,0.015); }
  .row:focus-visible {
    outline: 2px solid var(--status-up);
    outline-offset: -2px;
  }
  .row > * { min-width: 0; }
  .name-col { grid-area: name; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .spark-cell { grid-area: sparkline; min-width: 0; display: block; }
  .bar-cell { grid-area: bar; min-width: 0; }
  .uptime { grid-area: uptime; text-align: right; font-variant-numeric: tabular-nums; }
  .latency { grid-area: latency; text-align: right; font-variant-numeric: tabular-nums; opacity: 0.85; }
  .latency[data-tier="fast"] { color: var(--status-up); }
  .latency[data-tier="ok"]   { color: var(--text); }
  .latency[data-tier="slow"] { color: var(--status-deg); }

  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .dot-healthy { background: var(--status-up); box-shadow: 0 0 8px rgba(63,185,80,0.5); }
  .dot-degraded { background: var(--status-deg); box-shadow: 0 0 8px rgba(210,153,34,0.5); }
  .dot-unhealthy { background: var(--status-down); box-shadow: 0 0 8px rgba(248,81,73,0.5); }
  .dot.pulse {
    animation: dotPulse 2s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%, 100% { box-shadow: 0 0 0 0 currentColor; }
    50% { box-shadow: 0 0 0 6px color-mix(in srgb, currentColor 15%, transparent); }
  }
  .dot-degraded.pulse { color: var(--status-deg); }
  .dot-unhealthy.pulse { color: var(--status-down); }
  @media (prefers-reduced-motion: reduce) {
    .dot.pulse { animation: none; }
  }
  .name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .caret {
    font-size: 10px;
    opacity: 0.4;
    transition: transform .15s;
    margin-left: auto;
  }
  .row[aria-expanded="true"] .caret { transform: rotate(90deg); }

  /* Stack on narrow page: driven by the .page container (statusPage) so
     it fires based on the page width rather than the row's own
     min-content width (which is larger than 640px). */
  @container statusPage (max-width: 640px) {
    .row {
      grid-template-columns: 1fr auto auto;
      grid-template-areas:
        "name uptime latency"
        "bar  bar    bar";
      gap: var(--sp-xs) var(--sp-sm);
      padding-block: var(--sp-md);
    }
    .spark-cell { display: none; }
    .uptime { font-weight: 600; justify-self: end; }
    .latency { justify-self: end; }
  }
</style>
