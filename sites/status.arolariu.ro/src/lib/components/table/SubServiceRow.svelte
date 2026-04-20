<script lang="ts">
  /**
   * SubServiceRow
   * -------------
   * Indented row rendered inside {@link ServiceDetailPanel}, one per
   * sub-check (dependency, TLS, DNS, etc.). Shares the table grid layout
   * with {@link ServiceRow} so columns align visually, but uses a
   * smaller-height `variant="sub"` UptimeBar and a dimmer opacity.
   *
   * Not itself expandable — the sub-row is purely a readout; hover/focus on
   * its segments forwards up to the same shared tooltip channel as the
   * parent row.
   */
  import type {Bucket, ServiceId} from "../../types/status";
  import {computeUptime} from "../../aggregation/computeUptime";
  import {computeAvgLatency} from "../../aggregation/computeAvgLatency";
  import {deriveLatestStatus} from "../../aggregation/deriveParentStatus";
  import {latencyTier} from "../../aggregation/latencyTier";
  import UptimeBar from "./UptimeBar.svelte";

  /** Props for the {@link SubServiceRow} component. */
  interface Props {
    /** Parent service id — used to synthesize a series object for the status derivation helper. */
    service: ServiceId;
    /** Display name of the sub-check. */
    name: string;
    /** Windowed buckets for this sub-check. */
    buckets: readonly Bucket[];
    /** Hover/focus callback forwarded to the segment-tooltip anchor. */
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
    /** Stable tooltip id for `aria-describedby` wiring. */
    tooltipId?: string | undefined;
    /** Timestamp of the currently-hovered bucket (route state — pass-through). */
    hoveredBucketT?: string | null;
    /** Base bucket span in ms — forwarded to UptimeBar for merged-bucket range math. */
    bucketDurationMs?: number | undefined;
  }

  let {service, name, buckets, onHover, tooltipId, hoveredBucketT = null, bucketDurationMs}: Props = $props();

  // Empty-buckets short-circuit avoids running `deriveLatestStatus` on an
  // empty array (its contract requires at least one bucket).
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
  <div class="uptime">{uptime.toFixed(3)}%</div>
  <div class="latency" data-tier={latencyTier(avgLatency)}>{avgLatency} ms</div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: var(--status-table-grid);
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
