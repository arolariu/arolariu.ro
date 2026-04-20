<script lang="ts">
  import type {Bucket, ServiceSeries} from "../types/status";
  import LatencyChart from "./LatencyChart.svelte";
  import SubServiceRow from "./SubServiceRow.svelte";

  interface Props {
    series: ServiceSeries;
    bucketDurationMs: number;
    onHover: (bucket: Bucket | null, anchor: HTMLElement | null) => void;
    tooltipId?: string;
    hoveredBucketT?: string | null;
  }

  let {series, bucketDurationMs, onHover, tooltipId, hoveredBucketT = null}: Props = $props();

  const subEntries = $derived(
    series.subSeries ? Object.entries(series.subSeries) : []
  );
</script>

<section class="detail" role="region" aria-label={`Detail for ${series.service}`}>
  {#if subEntries.length > 0}
    <div class="subchecks">
      {#each subEntries as [name, buckets] (name)}
        <SubServiceRow {name} {buckets} {onHover} {tooltipId} {hoveredBucketT}/>
      {/each}
    </div>
  {/if}
  <div class="chart-block">
    <h4 class="chart-heading">Latency trend · p50 and p99 over the selected window</h4>
    <LatencyChart buckets={series.buckets} service={series.service} {bucketDurationMs}/>
  </div>
</section>

<style>
  .detail {
    padding: var(--sp-sm) var(--sp-md);
    background: rgba(255, 255, 255, 0.01);
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
