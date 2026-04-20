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
  import FilterPills from "$lib/components/chrome/FilterPills.svelte";
  import StatusBanner from "$lib/components/summary/StatusBanner.svelte";
  import ServiceRow from "$lib/components/table/ServiceRow.svelte";
  import IncidentList from "$lib/components/incidents/IncidentList.svelte";
  import SkeletonRow from "$lib/components/table/SkeletonRow.svelte";
  import SegmentTooltip from "$lib/components/table/SegmentTooltip.svelte";
  import RefreshButton from "$lib/components/chrome/RefreshButton.svelte";
  import SummaryStats from "$lib/components/summary/SummaryStats.svelte";
  import LightModeToggle from "$lib/components/chrome/LightModeToggle.svelte";
  import KeyboardHelpOverlay from "$lib/components/chrome/KeyboardHelpOverlay.svelte";
  import WeekdayUptimeChart from "$lib/components/charts/WeekdayUptimeChart.svelte";

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

  <footer class="footer label-comment">
    Polled every 30 min via GitHub Actions · data served from arolariu/arolariu.ro status-data branch
  </footer>

  <SegmentTooltip bucket={hoveredBucket} anchor={hoveredAnchor} id={TOOLTIP_ID} {bucketDurationMs}/>

  <KeyboardHelpOverlay open={helpOpen} onClose={() => (helpOpen = false)} />
</main>

<style src="./+page.svelte.css"></style>
