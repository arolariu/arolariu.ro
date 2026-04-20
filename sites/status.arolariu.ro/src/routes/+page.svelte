<script lang="ts">
  import {onMount} from "svelte";
  import type {AggregateFile, Bucket, FilterWindow, IncidentsFile, ServiceSeries} from "$lib/types/status";
  import {WINDOW_TO_GRANULARITY} from "$lib/types/status";
  import {fetchAggregate, fetchIncidents, invalidateAllCaches} from "$lib/api/fetchStatusData";
  import {isLocalHost} from "$lib/api/mockData";
  import {sliceWindow} from "$lib/aggregation/sliceWindow";
  import {deriveOverallStatus} from "$lib/aggregation/deriveParentStatus";
  import FilterPills from "$lib/components/FilterPills.svelte";
  import StatusBanner from "$lib/components/StatusBanner.svelte";
  import ServiceRow from "$lib/components/ServiceRow.svelte";
  import IncidentList from "$lib/components/IncidentList.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import SegmentTooltip from "$lib/components/SegmentTooltip.svelte";

  let activeWindow: FilterWindow = $state("1d");
  let cache: Partial<Record<"fine" | "hourly" | "daily", AggregateFile>> = $state({});
  let incidents: IncidentsFile | null = $state(null);
  let loadError: string | null = $state(null);
  let refreshing: boolean = $state(false);
  let expanded: Record<string, boolean> = $state({});
  let hoveredBucket: Bucket | null = $state(null);
  let hoveredAnchor: HTMLElement | null = $state(null);

  const granularity = $derived(WINDOW_TO_GRANULARITY[activeWindow]);

  const sliced = $derived.by<AggregateFile | null>(() => {
    const file = cache[granularity];
    return file ? sliceWindow(file, activeWindow) : null;
  });

  const overallStatus = $derived.by(() =>
    sliced ? deriveOverallStatus(sliced.services) : "loading" as const
  );

  const lastProbeAt = $derived(sliced?.generatedAt);

  function orderedServices(file: AggregateFile | null): readonly ServiceSeries[] {
    if (!file) return [];
    const order = ["arolariu.ro", "api.arolariu.ro", "exp.arolariu.ro", "cv.arolariu.ro"];
    return [...file.services].sort((a, b) => order.indexOf(a.service) - order.indexOf(b.service));
  }

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

  onMount(() => { void loadIncidents(); });

  async function handleRefresh() {
    refreshing = true;
    invalidateAllCaches();
    cache = {};
    incidents = null;
    await Promise.all([loadAggregate(granularity), loadIncidents()]);
    refreshing = false;
  }

  function toggleExpand(service: string) {
    expanded = {...expanded, [service]: !expanded[service]};
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
  <header class="header">
    <div>
      <h1>arolariu.ro — Service Status</h1>
      <p class="sub">Health of arolariu.ro services, refreshed every 30 minutes</p>
    </div>
  </header>

  <StatusBanner {overallStatus} {lastProbeAt} {refreshing} onRefresh={handleRefresh}/>

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
      {#each orderedServices(sliced) as series (series.service)}
        <ServiceRow
          {series}
          expanded={expanded[series.service] ?? false}
          onToggle={() => toggleExpand(series.service)}
          {onHover}
        />
      {/each}
    {/if}
  </section>

  <IncidentList {incidents} windowFilter={activeWindow}/>

  <footer class="footer">
    {#if isLocalHost()}
      <span class="local-badge">LOCAL MOCKS</span>
      Synthetic data generated in-browser — run on status.arolariu.ro to see live probes
    {:else}
      Polled every 30 min via GitHub Actions · data served from arolariu/arolariu.ro status-data branch
    {/if}
  </footer>

  <SegmentTooltip bucket={hoveredBucket} anchor={hoveredAnchor}/>
</main>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 28px 32px;
  }
  .header {
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .sub {
    font-size: 12px;
    opacity: 0.55;
    margin: 4px 0 0 0;
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
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
    background: var(--surface);
    border-radius: 10px;
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .status-table__header {
    display: grid;
    grid-template-columns: 1.4fr 2.2fr 80px 100px;
    gap: 14px;
    padding: 10px 16px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.45;
    background: var(--surface-hover);
    border-bottom: 1px solid var(--border-strong);
  }
  .status-table__header > * { min-width: 0; }
  .empty {
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
  .footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-size: 10.5px;
    opacity: 0.4;
    text-align: center;
  }
  .local-badge {
    display: inline-block;
    padding: 1px 6px;
    margin-right: 6px;
    border-radius: 3px;
    background: var(--status-deg-bg);
    color: var(--status-deg);
    border: 1px solid var(--status-deg-border);
    font-weight: 600;
    font-size: 9px;
    letter-spacing: 0.08em;
  }
  @media (max-width: 768px) {
    .status-table__header { grid-template-columns: 1fr 1.5fr 60px; }
    .status-table__header > :nth-child(4) { display: none; }
  }
</style>
