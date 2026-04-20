<script lang="ts">
  /**
   * Summary card showing the unweighted mean of per-service p50 latencies
   * (in milliseconds). The displayed number is tweened via `useCountTween`
   * so filter-window changes animate smoothly, and the tier class
   * (`tier-fast|ok|slow`) colors the value using shared thresholds.
   * Shares the `.card` shell styling defined globally in SummaryStats.
   */
  import type {ServiceSeries} from "../../types/status";
  import {computeAvgLatency} from "../../aggregation/summaryStats";
  import {latencyTier} from "../../aggregation/latencyTier";
  import {useCountTween} from "../../hooks/useCountTween.svelte";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    /** Per-service probe series already filtered to the active time window. */
    services: readonly ServiceSeries[];
  }

  let {services}: Props = $props();

  /** Raw aggregated latency (ms) — unweighted mean of each service's bucket p50. */
  const avgLatency = $derived(computeAvgLatency(services));
  /** Tweened accessor so transitions between windows animate rather than jump. */
  const displayLatency = useCountTween(() => avgLatency);
  /** Tier token (fast/ok/slow) used to color the value according to shared thresholds. */
  const tier = $derived(latencyTier(avgLatency));
</script>

<dl class="card">
  <dt>
    <span>Avg latency</span>
    <InfoButton text="Unweighted mean of bucket p50 latencies across services." />
  </dt>
  <dd class="value tier-{tier}">{Math.round(displayLatency())} ms</dd>
  <dd class="sub">p50 across all</dd>
</dl>
