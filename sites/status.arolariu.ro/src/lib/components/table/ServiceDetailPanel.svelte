<script lang="ts">
  /**
   * ServiceDetailPanel
   * ------------------
   * Expansion panel slotted beneath an expanded {@link ServiceRow}. Renders
   * one `SubServiceRow` per sub-check (dependency health, TLS, DNS, etc.)
   * plus a full-resolution {@link LatencyChart} for the parent's buckets.
   *
   * Slides in on mount; animation is suppressed under
   * `prefers-reduced-motion`. Hover/focus handlers are forwarded through to
   * the shared tooltip anchor so nested sub-rows participate in the same
   * tooltip channel as the parent row.
   */
  import type {Bucket, ServiceSeries} from "../../types/status";
  import LatencyChart from "../charts/LatencyChart.svelte";
  import SubServiceRow from "./SubServiceRow.svelte";

  /** Props for the {@link ServiceDetailPanel} component. */
  interface Props {
    /** Parent service series; sub-series (if any) render as nested rows. */
    series: ServiceSeries;
    /** Bucket span in ms — forwarded to the latency chart + nested rows. */
    bucketDurationMs: number;
    /** Hover/focus callback forwarded from the route-level tooltip orchestrator. */
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
    /** Stable tooltip id for `aria-describedby`. */
    tooltipId?: string | undefined;
    /** Timestamp of the currently-hovered bucket for aria wiring parity across rows. */
    hoveredBucketT?: string | null;
  }

  let {series, bucketDurationMs, onHover, tooltipId, hoveredBucketT = null}: Props = $props();

  // Object.entries gives a stable-enough iteration order for the sub-series
  // map. Empty when the service has no sub-checks.
  const subEntries = $derived(
    series.subSeries ? Object.entries(series.subSeries) : []
  );
</script>

<section class="detail" aria-label={`Detail for ${series.service}`}>
  {#if subEntries.length > 0}
    <div class="subchecks">
      {#each subEntries as [name, buckets] (name)}
        <SubServiceRow service={series.service} {name} {buckets} {onHover} {tooltipId} {hoveredBucketT} {bucketDurationMs}/>
      {/each}
    </div>
  {/if}
  <div class="chart-block">
    <h4 class="chart-heading">Latency percentiles · p50 / p75 / p95 / p99 over the selected window</h4>
    <LatencyChart buckets={series.buckets} service={series.service} {bucketDurationMs}/>
  </div>
</section>

<style>
  .detail {
    padding: var(--sp-sm) var(--sp-md);
    background: var(--surface-hover);
    border-bottom: 1px solid var(--border);
    animation: slideIn 200ms ease-out;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  .subchecks { margin-bottom: var(--sp-sm); }
  .chart-heading {
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
    margin: 0 0 var(--sp-xs);
    font-weight: 600;
  }
  @media (prefers-reduced-motion: reduce) {
    .detail { animation: none; }
  }
</style>
