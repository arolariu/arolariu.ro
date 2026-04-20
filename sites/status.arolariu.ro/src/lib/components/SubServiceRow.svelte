<script lang="ts">
  import type {Bucket} from "../types/status";
  import {computeUptime, computeAvgLatency} from "../aggregation/computeUptime";
  import {deriveLatestStatus} from "../aggregation/deriveParentStatus";
  import UptimeBar from "./UptimeBar.svelte";

  interface Props {
    name: string;
    buckets: readonly Bucket[];
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
    tooltipId?: string;
    hoveredBucketT?: string | null;
  }

  let {name, buckets, onHover, tooltipId, hoveredBucketT = null}: Props = $props();

  const latest = $derived(
    buckets.length === 0
      ? "Healthy" as const
      : deriveLatestStatus({service: "api.arolariu.ro", buckets})
  );
  const uptime = $derived(computeUptime(buckets));
  const avgLatency = $derived(computeAvgLatency(buckets));
</script>

<div class="row sub">
  <div class="name-col">
    <span class="dot dot-{latest.toLowerCase()}"></span>
    <span class="name">↳ {name}</span>
  </div>
  <div class="bar-cell"><UptimeBar {buckets} variant="sub" onSegmentHover={onHover} {tooltipId} {hoveredBucketT} /></div>
  <div class="uptime">{uptime}%</div>
  <div class="latency">{avgLatency} ms</div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(10rem, 1.4fr) minmax(0, 2.2fr) 6ch 7ch;
    grid-template-areas: "name bar uptime latency";
    gap: var(--sp-sm);
    align-items: center;
    padding: var(--sp-xs) var(--sp-md) var(--sp-xs) 40px;
    border-bottom: 1px solid var(--border);
    font-size: var(--fs-sm);
    background: var(--surface);
    opacity: 0.9;
    container-type: inline-size;
    container-name: subServiceRow;
  }
  .row > * { min-width: 0; }
  .name-col { grid-area: name; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .bar-cell { grid-area: bar; min-width: 0; }
  .uptime { grid-area: uptime; text-align: right; font-size: var(--fs-xs); font-variant-numeric: tabular-nums; }
  .latency { grid-area: latency; text-align: right; font-size: var(--fs-xs); opacity: 0.85; font-variant-numeric: tabular-nums; }

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

  @container subServiceRow (max-width: 640px) {
    .row {
      grid-template-columns: 1fr auto auto;
      grid-template-areas:
        "name uptime latency"
        "bar  bar    bar";
      gap: var(--sp-xs) var(--sp-sm);
      padding-block: var(--sp-sm);
      padding-left: var(--sp-md);
    }
    .uptime { font-weight: 600; justify-self: end; }
    .latency { justify-self: end; }
  }
</style>
