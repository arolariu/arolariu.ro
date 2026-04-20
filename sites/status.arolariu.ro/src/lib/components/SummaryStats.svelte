<script lang="ts">
  import {onMount} from "svelte";
  import type {FilterWindow, IncidentsFile, ServiceSeries} from "../types/status";
  import {computeOverallUptime, computeAvgLatency, computeIncidentCount, computeMttr} from "../aggregation/summaryStats";
  import {formatDuration} from "../aggregation/formatDuration";

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

  // Animated counters: tween the displayed numeric values toward the derived
  // targets. Uses requestAnimationFrame; cancels cleanly on teardown.
  let displayUptime = $state(0);
  let displayLatency = $state(0);
  let displayIncidents = $state(0);
  let displayMttr = $state<number | undefined>(undefined);

  const ANIM_MS = 400;
  let rafId: number | null = null;

  function animate(from: number, to: number, setter: (v: number) => void): void {
    if (from === to) { setter(to); return; }
    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setter(from + (to - from) * eased);
      if (t < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  $effect(() => {
    if (prefersReducedMotion) { displayUptime = uptime; return; }
    animate(displayUptime, uptime, (v) => { displayUptime = v; });
  });
  $effect(() => {
    if (prefersReducedMotion) { displayLatency = avgLatency; return; }
    animate(displayLatency, avgLatency, (v) => { displayLatency = v; });
  });
  $effect(() => {
    if (prefersReducedMotion) { displayIncidents = incCount.total; return; }
    animate(displayIncidents, incCount.total, (v) => { displayIncidents = v; });
  });
  $effect(() => {
    displayMttr = mttr; // no tween — it's shown formatted
  });

  onMount(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });

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

<section class="summary-stats" aria-label="Summary statistics">
  <dl class="card">
    <dt>Overall uptime</dt>
    <dd class="value tier-{uptimeTier}">{displayUptime.toFixed(1)}%</dd>
    <dd class="sub">avg · last {windowFilter}</dd>
  </dl>
  <dl class="card">
    <dt>Avg latency</dt>
    <dd class="value tier-{latencyTier}">{Math.round(displayLatency)} ms</dd>
    <dd class="sub">p50 across all</dd>
  </dl>
  <dl class="card">
    <dt>Incidents</dt>
    <dd class="value tier-{incidentsTier}">{Math.round(displayIncidents)}</dd>
    <dd class="sub">{incCount.open} ongoing · {incCount.resolved} resolved</dd>
  </dl>
  <dl class="card">
    <dt>MTTR</dt>
    <dd class="value">{formatDuration(displayMttr)}</dd>
    <dd class="sub">mean time to resolve</dd>
  </dl>
</section>

<style>
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sp-sm);
    margin-bottom: var(--sp-md);
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--sp-sm) var(--sp-md);
    margin: 0;
  }
  dt {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.5;
    margin-bottom: 2px;
  }
  .value {
    margin: 0;
    font-size: var(--fs-h2);
    font-weight: 600;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  .value.tier-fast { color: var(--status-up); }
  .value.tier-ok   { color: var(--text); }
  .value.tier-slow { color: var(--status-deg); }
  .sub {
    margin: 2px 0 0 0;
    font-size: var(--fs-xs);
    opacity: 0.55;
  }
  @container statusPage (max-width: 640px) {
    .summary-stats { grid-template-columns: repeat(2, 1fr); }
  }
</style>
