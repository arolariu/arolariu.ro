<script lang="ts">
  import type {Bucket, ServiceSeries} from "../types/status";
  import {computeUptime, computeAvgLatency} from "../aggregation/computeUptime";
  import {deriveLatestStatus} from "../aggregation/deriveParentStatus";
  import UptimeBar from "./UptimeBar.svelte";
  import SubServiceRow from "./SubServiceRow.svelte";

  interface Props {
    series: ServiceSeries;
    expanded: boolean;
    onToggle: () => void;
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
  }

  let {series, expanded, onToggle, onHover}: Props = $props();

  const latest = $derived(deriveLatestStatus(series));
  const uptime = $derived(computeUptime(series.buckets));
  const avgLatency = $derived(computeAvgLatency(series.buckets));
  const hasSubs = $derived(
    series.subSeries !== undefined && Object.keys(series.subSeries).length > 0
  );
  const subEntries = $derived(
    series.subSeries ? Object.entries(series.subSeries) : []
  );
</script>

<div class="row">
  <div class="name-col">
    <span class="dot dot-{latest.toLowerCase()}"></span>
    <span class="name">{series.service}</span>
    {#if hasSubs}
      <button
        type="button"
        class="toggle"
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse sub-checks" : "Expand sub-checks"}
        onclick={onToggle}
      >{expanded ? "▾" : "▸"}</button>
    {/if}
  </div>
  <UptimeBar buckets={series.buckets} onSegmentHover={onHover} />
  <div class="uptime">{uptime}%</div>
  <div class="latency">{avgLatency} ms</div>
</div>

{#if expanded && hasSubs}
  {#each subEntries as [name, buckets] (name)}
    <SubServiceRow {name} {buckets} {onHover} />
  {/each}
{/if}

<style>
  .row {
    display: grid;
    grid-template-columns: 1.4fr 2.2fr 80px 100px;
    gap: 14px;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .name-col { display: flex; align-items: center; gap: 8px; }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .dot-healthy { background: var(--status-up); box-shadow: 0 0 8px rgba(63,185,80,0.5); }
  .dot-degraded { background: var(--status-deg); box-shadow: 0 0 8px rgba(210,153,34,0.5); }
  .dot-unhealthy { background: var(--status-down); }
  .name { font-weight: 500; }
  .toggle {
    background: transparent;
    border: 0;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
  }
  .uptime { text-align: right; }
  .latency { text-align: right; opacity: 0.85; }
</style>
