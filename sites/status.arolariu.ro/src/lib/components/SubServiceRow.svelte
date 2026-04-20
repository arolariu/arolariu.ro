<script lang="ts">
  import type {Bucket} from "../types/status";
  import {computeUptime, computeAvgLatency} from "../aggregation/computeUptime";
  import {deriveLatestStatus} from "../aggregation/deriveParentStatus";
  import UptimeBar from "./UptimeBar.svelte";

  interface Props {
    name: string;
    buckets: readonly Bucket[];
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
  }

  let {name, buckets, onHover}: Props = $props();

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
  <UptimeBar {buckets} variant="sub" onSegmentHover={onHover} />
  <div class="uptime">{uptime}%</div>
  <div class="latency">{avgLatency} ms</div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 1.4fr 2.2fr 80px 100px;
    gap: 14px;
    align-items: center;
    padding: 10px 14px 10px 40px;
    border-bottom: 1px solid var(--border);
    font-size: 12.5px;
    background: var(--surface);
    opacity: 0.9;
  }
  .row > * { min-width: 0; }
  .name-col { display: flex; align-items: center; gap: 8px; }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
  .dot-healthy { background: var(--status-up); }
  .dot-degraded { background: var(--status-deg); }
  .dot-unhealthy { background: var(--status-down); }
  .uptime { text-align: right; font-size: 12px; }
  .latency { text-align: right; font-size: 12px; opacity: 0.85; }
</style>
