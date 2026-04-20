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
      >▸</button>
    {/if}
  </div>
  <div class="bar-cell"><UptimeBar buckets={series.buckets} onSegmentHover={onHover} /></div>
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
    grid-template-columns: minmax(10rem, 1.4fr) minmax(0, 2.2fr) 6ch 7ch;
    grid-template-areas: "name bar uptime latency";
    gap: var(--sp-sm);
    align-items: center;
    padding: var(--sp-sm) var(--sp-md);
    border-bottom: 1px solid var(--border);
    font-size: var(--fs-body);
    container-type: inline-size;
    container-name: serviceRow;
  }
  .row > * { min-width: 0; }
  .name-col { grid-area: name; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .bar-cell { grid-area: bar; min-width: 0; }
  .uptime { grid-area: uptime; text-align: right; font-variant-numeric: tabular-nums; }
  .latency { grid-area: latency; text-align: right; font-variant-numeric: tabular-nums; opacity: 0.85; }

  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .dot-healthy { background: var(--status-up); box-shadow: 0 0 8px rgba(63,185,80,0.5); }
  .dot-degraded { background: var(--status-deg); box-shadow: 0 0 8px rgba(210,153,34,0.5); }
  .dot-unhealthy { background: var(--status-down); box-shadow: 0 0 8px rgba(248,81,73,0.5); }
  .name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .toggle {
    background: transparent;
    border: 0;
    color: var(--text-muted);
    cursor: pointer;
    font-size: var(--fs-xs);
    padding: 2px 4px;
    transition: transform .15s;
  }
  .toggle[aria-expanded="true"] { transform: rotate(90deg); }

  @container serviceRow (max-width: 640px) {
    .row {
      grid-template-columns: 1fr auto auto;
      grid-template-areas:
        "name uptime latency"
        "bar  bar    bar";
      gap: var(--sp-xs) var(--sp-sm);
      padding-block: var(--sp-md);
    }
    .uptime { font-weight: 600; justify-self: end; }
    .latency { justify-self: end; }
  }
</style>
