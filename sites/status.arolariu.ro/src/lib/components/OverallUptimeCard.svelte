<script lang="ts">
  import type {FilterWindow, ServiceSeries} from "../types/status";
  import {computeOverallUptime} from "../aggregation/summaryStats";
  import {computeWorstUptime} from "../aggregation/worstUptime";
  import {useCountTween} from "../hooks/useCountTween.svelte";
  import InfoButton from "./InfoButton.svelte";

  interface Props {
    services: readonly ServiceSeries[];
    windowFilter: FilterWindow;
  }

  let {services, windowFilter}: Props = $props();

  const uptime = $derived(computeOverallUptime(services));
  const worst = $derived(computeWorstUptime(services));
  const displayUptime = useCountTween(() => uptime);
  const tier = $derived(uptime >= 99.9 ? "fast" : uptime >= 99 ? "ok" : "slow");
</script>

<!--
  Styling for the shared card shell (`.card`, `dt`, `.value`, `.sub`, `.worst`)
  lives on SummaryStats.svelte via `.summary-stats :global(...)` rules so all
  four cards render identically without cross-file CSS duplication.
-->
<dl class="card">
  <dt>
    <span>Overall uptime</span>
    <InfoButton text="Probe-weighted average across all monitored services over the selected window. Worst-service uptime shown below." />
  </dt>
  <dd class="value tier-{tier}">{displayUptime().toFixed(3)}%</dd>
  <dd class="sub">weighted · last {windowFilter}</dd>
  {#if worst.service && worst.uptime < uptime}
    <dd class="worst">worst: <strong>{worst.service}</strong> · {worst.uptime.toFixed(1)}%</dd>
  {/if}
</dl>
