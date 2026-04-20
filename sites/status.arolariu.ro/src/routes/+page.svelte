<script lang="ts">
  import {onMount} from "svelte";
  import type {AggregateFile, Bucket, FilterWindow, IncidentsFile} from "$lib/types/status";
  import {WINDOW_CONFIGS} from "$lib/types/status";
  import {fetchAggregate, fetchIncidents, invalidateAllCaches} from "$lib/api/fetchStatusData";
  import {isLocalHost} from "$lib/api/mockData";
  import {sliceWindow} from "$lib/aggregation/sliceWindow";
  import {deriveOverallStatus} from "$lib/aggregation/deriveParentStatus";
  import {
    bucketDurationMsFor,
    orderedServices,
    showWeekdayChart,
  } from "$lib/routes/pageLogic";
  import {createKeyboardHandler} from "$lib/routes/keyboardShortcuts";
  import FilterPills from "$lib/components/FilterPills.svelte";
  import StatusBanner from "$lib/components/StatusBanner.svelte";
  import ServiceRow from "$lib/components/ServiceRow.svelte";
  import IncidentList from "$lib/components/IncidentList.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import SegmentTooltip from "$lib/components/SegmentTooltip.svelte";
  import RefreshButton from "$lib/components/RefreshButton.svelte";
  import SummaryStats from "$lib/components/SummaryStats.svelte";
  import LightModeToggle from "$lib/components/LightModeToggle.svelte";
  import KeyboardHelpOverlay from "$lib/components/KeyboardHelpOverlay.svelte";
  import WeekdayUptimeChart from "$lib/components/WeekdayUptimeChart.svelte";

  const TOOLTIP_ID = "status-segment-tooltip";

  let activeWindow: FilterWindow = $state("1d");
  let cache: Partial<Record<"fine" | "hourly" | "daily", AggregateFile>> = $state({});
  let incidents: IncidentsFile | null = $state(null);
  let loadError: string | null = $state(null);
  let refreshing: boolean = $state(false);
  let expandedService: string | null = $state(null);
  let hoveredBucket: Bucket | null = $state(null);
  let hoveredAnchor: HTMLElement | null = $state(null);
  let helpOpen = $state(false);

  const showWeekday = $derived(showWeekdayChart(activeWindow));

  const granularity = $derived(WINDOW_CONFIGS[activeWindow].granularity);

  const sliced = $derived.by<AggregateFile | null>(() => {
    const file = cache[granularity];
    return file ? sliceWindow(file, activeWindow) : null;
  });

  const bucketDurationMs = $derived(bucketDurationMsFor(sliced?.bucketSize));

  const overallStatus = $derived.by(() =>
    sliced ? deriveOverallStatus(sliced.services) : "loading" as const
  );

  const lastProbeAt = $derived(sliced?.generatedAt);

  async function loadAggregate(g: "fine" | "hourly" | "daily") {
    if (cache[g]) return;
    try {
      const file = await fetchAggregate(g);
      cache = {...cache, [g]: file};
      loadError = null;
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  async function loadIncidents() {
    try {
      incidents = await fetchIncidents();
    } catch {
      // Non-fatal; incidents just won't render.
    }
  }

  $effect(() => { void loadAggregate(granularity); });

  const handleGlobalKeydown = createKeyboardHandler({
    getActiveWindow: () => activeWindow,
    setActiveWindow: (w) => { activeWindow = w; },
    getExpandedService: () => expandedService,
    setExpandedService: (s) => { expandedService = s; },
    toggleHelp: () => { helpOpen = !helpOpen; },
    refresh: () => { void handleRefresh(); },
  });

  onMount(() => {
    void loadIncidents();
    window.addEventListener("keydown", handleGlobalKeydown);
    return () => { window.removeEventListener("keydown", handleGlobalKeydown); };
  });

  async function handleRefresh() {
    refreshing = true;
    invalidateAllCaches();
    cache = {};
    incidents = null;
    await Promise.all([loadAggregate(granularity), loadIncidents()]);
    refreshing = false;
  }

  function toggleExpand(service: string) {
    expandedService = expandedService === service ? null : service;
  }

  function onHover(bucket: Bucket | null, anchor: HTMLElement | null) {
    hoveredBucket = bucket;
    hoveredAnchor = anchor;
  }
</script>

<svelte:head>
  <title>status.arolariu.ro</title>
</svelte:head>

<main class="page">
  <header class="masthead">
    <div class="masthead-left">
      <h1 class="wordmark">
        <span class="prompt" aria-hidden="true">$</span>
        <span class="verb">status</span>
        <span class="target">arolariu.ro</span>
        <span class="cursor" aria-hidden="true">_</span>
      </h1>
      <p class="kicker">
        <span class="bracket">[</span>
        service&nbsp;monitor
        <span class="sep">::</span>
        polled&nbsp;every&nbsp;30m
        <span class="bracket">]</span>
      </p>
    </div>
    <div class="masthead-right">
      {#if isLocalHost()}
        <span class="local-badge">[ local mocks ]</span>
      {/if}
      <LightModeToggle />
      <RefreshButton {refreshing} onClick={handleRefresh}/>
    </div>
  </header>

  <StatusBanner {overallStatus} {lastProbeAt}/>

  {#if sliced}
    <SummaryStats services={sliced.services} {incidents} windowFilter={activeWindow}/>
  {/if}

  <div class="controls">
    <FilterPills {activeWindow} onChange={(w) => { activeWindow = w; }}/>
  </div>

  {#if loadError}
    <div class="error" role="alert">
      Status data unreachable — <button type="button" onclick={handleRefresh}>retry</button>
    </div>
  {/if}

  <section class="status-table" aria-label="Service uptime table">
    <div class="status-table__header">
      <div>Service</div>
      <div>p50 trend</div>
      <div>Uptime timeline</div>
      <div>Uptime</div>
      <div>Avg latency</div>
    </div>

    {#if !sliced}
      <SkeletonRow/>
      <SkeletonRow/>
      <SkeletonRow indent/>
      <SkeletonRow indent/>
      <SkeletonRow/>
      <SkeletonRow/>
    {:else if sliced.services.length === 0}
      <div class="empty">No probes recorded yet — first data in ≤30 min.</div>
    {:else}
      {#key activeWindow}
        <div class="status-rows-slot">
          {#each orderedServices(sliced) as series (series.service)}
            <ServiceRow
              {series}
              expanded={expandedService === series.service}
              onToggle={() => toggleExpand(series.service)}
              {onHover}
              tooltipId={TOOLTIP_ID}
              hoveredBucketT={hoveredBucket?.t ?? null}
              {bucketDurationMs}
            />
          {/each}
        </div>
      {/key}
    {/if}
  </section>

  {#if sliced?.services.length && showWeekday}
    <WeekdayUptimeChart services={orderedServices(sliced)} />
  {/if}

  <IncidentList {incidents} windowFilter={activeWindow}/>

  <footer class="footer">
    Polled every 30 min via GitHub Actions · data served from arolariu/arolariu.ro status-data branch
  </footer>

  <SegmentTooltip bucket={hoveredBucket} anchor={hoveredAnchor} id={TOOLTIP_ID} {bucketDurationMs}/>

  <KeyboardHelpOverlay open={helpOpen} onClose={() => (helpOpen = false)} />
</main>

<style>
  .page {
    width: min(var(--page-max), 100% - 2 * var(--gutter));
    margin-inline: auto;
    padding-block: var(--sp-xl) var(--sp-lg);
    container-type: inline-size;
    container-name: statusPage;
  }
  .masthead {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--sp-md);
    padding-bottom: var(--sp-lg);
    border-bottom: 1px solid var(--border-strong);
    margin-bottom: var(--sp-xl);
    animation: consolePrint 450ms cubic-bezier(0.2, 0, 0, 1) both;
  }
  .masthead-left { min-width: 0; }
  .masthead-right {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
    flex-shrink: 0;
    padding-bottom: 4px;
  }
  .wordmark {
    font-family: var(--font-mono);
    font-size: var(--fs-h1);
    font-weight: 500;
    line-height: 1.1;
    margin: 0;
    letter-spacing: -0.005em;
    color: var(--text);
    display: inline-flex;
    align-items: baseline;
    gap: 0.45em;
    flex-wrap: wrap;
  }
  .wordmark .prompt {
    color: var(--accent);
    font-weight: 600;
  }
  .wordmark .verb {
    color: var(--text-muted);
    font-weight: 400;
  }
  .wordmark .target {
    color: var(--text);
    font-weight: 500;
  }
  .wordmark .cursor {
    color: var(--accent);
    font-weight: 500;
    animation: blink 1.1s steps(1) infinite;
    margin-left: -0.15em;
  }
  .kicker {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    margin: var(--sp-sm) 0 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .kicker .bracket { color: var(--accent-dim); }
  .kicker .sep { color: var(--accent-dim); margin: 0 2px; }
  @container statusPage (max-width: 640px) {
    .masthead { flex-direction: column; align-items: flex-start; }
    .masthead-right { padding-bottom: 0; align-self: stretch; justify-content: flex-end; }
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-md);
  }
  .error {
    padding: 12px 14px;
    background: var(--status-down-bg);
    border: 1px solid var(--status-down);
    border-radius: 6px;
    margin-bottom: 14px;
    font-size: 13px;
  }
  .error button {
    background: transparent;
    border: 1px solid currentColor;
    color: inherit;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 6px;
  }
  .status-table {
    background: transparent;
    border-top: 1px solid var(--border-strong);
    border-bottom: 1px solid var(--border-strong);
  }
  .status-table__header {
    display: grid;
    grid-template-columns: minmax(8rem, 1.4fr) 70px minmax(0, 2fr) 8ch 7ch;
    grid-template-areas: "name sparkline bar uptime latency";
    gap: var(--sp-sm);
    padding: 12px var(--sp-md);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-muted);
    background: transparent;
    border-bottom: 1px solid var(--border);
  }
  .status-table__header > * { min-width: 0; }
  .status-table__header > :nth-child(1) { grid-area: name; }
  .status-table__header > :nth-child(2) { grid-area: sparkline; text-align: center; }
  .status-table__header > :nth-child(3) { grid-area: bar; }
  .status-table__header > :nth-child(4) { grid-area: uptime; text-align: right; }
  .status-table__header > :nth-child(5) { grid-area: latency; text-align: right; }
  @container statusPage (max-width: 640px) {
    /* Card layout labels service/uptime/latency inline; the grid header
       is redundant and would overflow the narrow page. Hide it. */
    .status-table__header { display: none; }
  }
  .status-rows-slot {
    animation: fadeIn 180ms ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0.45; transform: translateY(-2px); }
    to   { opacity: 1;    transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .status-rows-slot { animation: none; }
  }
  .empty {
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
  .footer {
    font-family: var(--font-mono);
    font-weight: 400;
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    padding-block: var(--sp-xl);
    margin-top: var(--sp-xl);
    border-top: 1px solid var(--border);
    letter-spacing: 0.01em;
  }
  .footer::before { content: "// "; color: var(--accent-dim); }
  .local-badge {
    display: inline-block;
    padding: 2px 6px;
    background: transparent;
    color: var(--accent);
    border: 0;
    font-family: var(--font-mono);
    font-weight: 400;
    font-size: 10.5px;
    letter-spacing: 0.02em;
  }
  @media (max-width: 768px) {
    .status-table__header { grid-template-columns: 1fr 1.5fr 60px; }
    .status-table__header > :nth-child(2) { display: none; }
    .status-table__header > :nth-child(5) { display: none; }
  }
</style>
