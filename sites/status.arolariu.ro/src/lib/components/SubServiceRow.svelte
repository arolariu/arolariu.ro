<script lang="ts">
  import type {Bucket, ServiceId} from "../types/status";
  import {computeUptime, computeAvgLatency} from "../aggregation/computeUptime";
  import {deriveLatestStatus} from "../aggregation/deriveParentStatus";
  import UptimeBar from "./UptimeBar.svelte";

  interface Props {
    service: ServiceId;
    name: string;
    buckets: readonly Bucket[];
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
    tooltipId?: string;
    hoveredBucketT?: string | null;
    bucketDurationMs?: number;
  }

  let {service, name, buckets, onHover, tooltipId, hoveredBucketT = null, bucketDurationMs}: Props = $props();

  const latest = $derived(
    buckets.length === 0
      ? "Healthy" as const
      : deriveLatestStatus({service, buckets})
  );
  const uptime = $derived(computeUptime(buckets));
  const avgLatency = $derived(computeAvgLatency(buckets));
</script>

<div class="row sub">
  <div class="name-col">
    <span class="dot dot-{latest.toLowerCase()}"></span>
    <span class="name">↳ {name}</span>
  </div>
  <div class="spark-cell"></div>
  <div class="bar-cell"><UptimeBar {buckets} variant="sub" onSegmentHover={onHover} {tooltipId} {hoveredBucketT} {bucketDurationMs} /></div>
  <div class="uptime">{uptime}%</div>
  <div class="latency" data-tier={avgLatency < 200 ? "fast" : avgLatency < 500 ? "ok" : "slow"}>{avgLatency} ms</div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(8rem, 1.4fr) 70px minmax(0, 2fr) 8ch 7ch;
    grid-template-areas: "name sparkline bar uptime latency";
    gap: var(--sp-sm);
    align-items: center;
    padding: var(--sp-xs) var(--sp-md) var(--sp-xs) 40px;
    border-bottom: 1px solid var(--border);
    font-size: var(--fs-sm);
    background: var(--surface);
    opacity: 0.9;
  }
  .row > * { min-width: 0; }
  .name-col { grid-area: name; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .spark-cell { grid-area: sparkline; min-width: 0; }
  .bar-cell { grid-area: bar; min-width: 0; }
  .uptime { grid-area: uptime; text-align: right; font-size: var(--fs-xs); font-variant-numeric: tabular-nums; }
  .latency { grid-area: latency; text-align: right; font-size: var(--fs-xs); opacity: 0.85; font-variant-numeric: tabular-nums; }
  .latency[data-tier="fast"] { color: var(--status-up); }
  .latency[data-tier="ok"]   { color: var(--text); }
  .latency[data-tier="slow"] { color: var(--status-deg); }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .dot-healthy { background: var(--status-up); }
  .dot-degraded { background: var(--status-deg); }
  .dot-unhealthy { background: var(--status-down); }
  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @container statusPage (max-width: 640px) {
    .row {
      grid-template-columns: 1fr auto auto;
      grid-template-areas:
        "name uptime latency"
        "bar  bar    bar";
      gap: var(--sp-xs) var(--sp-sm);
      padding-block: var(--sp-sm);
      padding-left: var(--sp-md);
    }
    .spark-cell { display: none; }
    .uptime { font-weight: 600; justify-self: end; }
    .latency { justify-self: end; }
  }
</style>
