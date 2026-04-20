<script lang="ts">
  /**
   * Summary card showing probe-weighted overall uptime across all monitored
   * services for the active window, plus a "worst: <service>" footer when
   * any individual service is below the aggregate. The headline percentage
   * is tweened via `useCountTween` so changes animate, and the tier class
   * drives the color band (fast ≥99.9%, ok ≥99%, slow otherwise).
   * Shares the `.card` shell styling defined globally in SummaryStats.
   */
  import type {FilterWindow, ServiceSeries} from "../../types/status";
  import {computeOverallUptime} from "../../aggregation/summaryStats";
  import {computeWorstUptime} from "../../aggregation/worstUptime";
  import {useCountTween} from "../../hooks/useCountTween.svelte";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    /** Per-service probe series already filtered to the active time window. */
    services: readonly ServiceSeries[];
    /** Active time window — surfaced in the subline (`last 7d`). */
    windowFilter: FilterWindow;
  }

  let {services, windowFilter}: Props = $props();

  /** Probe-weighted overall uptime percentage across all services. */
  const uptime = $derived(computeOverallUptime(services));
  /** Worst individual service `{service, uptime}` — shown as a footer when it's below the aggregate. */
  const worst = $derived(computeWorstUptime(services));
  /** Tweened accessor for the headline percentage. */
  const displayUptime = useCountTween(() => uptime);
  /** Color tier: fast ≥99.9%, ok ≥99%, slow otherwise. */
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
