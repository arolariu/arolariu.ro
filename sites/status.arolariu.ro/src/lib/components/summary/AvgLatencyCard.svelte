<script lang="ts">
  import type {ServiceSeries} from "../../types/status";
  import {computeAvgLatency} from "../../aggregation/summaryStats";
  import {latencyTier} from "../../aggregation/latencyTier";
  import {useCountTween} from "../../hooks/useCountTween.svelte";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    services: readonly ServiceSeries[];
  }

  let {services}: Props = $props();

  const avgLatency = $derived(computeAvgLatency(services));
  const displayLatency = useCountTween(() => avgLatency);
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
