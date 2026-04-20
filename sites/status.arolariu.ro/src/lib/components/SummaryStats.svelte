<script lang="ts">
  import type {FilterWindow, IncidentsFile, ServiceSeries} from "../types/status";
  import {computeOverallUptime, computeAvgLatency, computeIncidentCount, computeMttr} from "../aggregation/summaryStats";
  import {computeWorstUptime} from "../aggregation/worstUptime";
  import {formatDuration} from "../aggregation/formatDuration";
  import {useCountTween} from "../hooks/useCountTween.svelte";
  import InfoButton from "./InfoButton.svelte";

  interface Props {
    services: readonly ServiceSeries[];
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {services, incidents, windowFilter}: Props = $props();

  const uptime = $derived(computeOverallUptime(services));
  const avgLatency = $derived(computeAvgLatency(services));
  const incCount = $derived(computeIncidentCount(incidents, windowFilter));
  const mttr = $derived(computeMttr(incidents, windowFilter));
  const worst = $derived(computeWorstUptime(services));

  const displayUptime = useCountTween(() => uptime);
  const displayLatency = useCountTween(() => avgLatency);
  const displayIncidents = useCountTween(() => incCount.total);

  const uptimeTier = $derived(
    uptime >= 99.9 ? "fast" : uptime >= 99 ? "ok" : "slow"
  );
  const latencyTier = $derived(
    avgLatency < 200 ? "fast" : avgLatency < 500 ? "ok" : "slow"
  );
  const incidentsTier = $derived(
    incCount.open > 0 ? "slow" : incCount.total === 0 ? "fast" : "ok"
  );
</script>

<section class="summary-stats" data-testid="summary-stats" aria-label="Summary statistics">
  <dl class="card">
    <dt>
      <span>Overall uptime</span>
      <InfoButton text="Probe-weighted average across all monitored services over the selected window. Worst-service uptime shown below." />
    </dt>
    <dd class="value tier-{uptimeTier}">{displayUptime().toFixed(3)}%</dd>
    <dd class="sub">weighted · last {windowFilter}</dd>
    {#if worst.service && worst.uptime < uptime}
      <dd class="worst">worst: <strong>{worst.service}</strong> · {worst.uptime.toFixed(1)}%</dd>
    {/if}
  </dl>
  <dl class="card">
    <dt>
      <span>Avg latency</span>
      <InfoButton text="Unweighted mean of bucket p50 latencies across services." />
    </dt>
    <dd class="value tier-{latencyTier}">{Math.round(displayLatency())} ms</dd>
    <dd class="sub">p50 across all</dd>
  </dl>
  <dl class="card">
    <dt>
      <span>Incidents</span>
      <InfoButton text="Count of incidents whose start timestamp falls in the window." />
    </dt>
    <dd class="value tier-{incidentsTier}">{Math.round(displayIncidents())}</dd>
    <dd class="sub">{incCount.open} ongoing · {incCount.resolved} resolved</dd>
  </dl>
  <dl class="card">
    <dt>
      <span>MTTR</span>
      <InfoButton text="Mean duration of resolved incidents in the window." />
    </dt>
    <dd class="value">{formatDuration(mttr)}</dd>
    <dd class="sub">mean time to resolve</dd>
  </dl>
</section>

<style>
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-bottom: var(--sp-xl);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .card {
    background: transparent;
    border: 0;
    border-right: 1px solid var(--border);
    border-radius: 0;
    padding: var(--sp-md);
    margin: 0;
    position: relative;
    animation: consolePrint 500ms cubic-bezier(0.2, 0, 0, 1) both;
  }
  .card:last-child { border-right: 0; }
  .card:nth-child(1) { animation-delay: 60ms; }
  .card:nth-child(2) { animation-delay: 120ms; }
  .card:nth-child(3) { animation-delay: 180ms; }
  .card:nth-child(4) { animation-delay: 240ms; }
  dt {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 400;
    text-transform: lowercase;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    margin-bottom: 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  dt::before {
    content: "//";
    color: var(--accent-dim);
    margin-right: 2px;
    font-weight: 500;
  }
  .value {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-hero);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .value.tier-fast { color: var(--status-up); }
  .value.tier-ok   { color: var(--text); }
  .value.tier-slow { color: var(--status-deg); }
  .sub {
    margin: 10px 0 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.01em;
  }
  .worst {
    margin: 10px 0 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    padding-top: 8px;
    letter-spacing: 0.01em;
  }
  .worst strong {
    font-weight: 500;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  @container statusPage (max-width: 640px) {
    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
      border-left: 0;
      border-right: 0;
    }
    .card { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .card:nth-child(2n) { border-right: 0; }
    .card:nth-child(n+3) { border-bottom: 0; }
  }
</style>
