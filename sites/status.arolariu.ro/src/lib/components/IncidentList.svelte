<script lang="ts">
  import {onMount} from "svelte";
  import type {Incident, IncidentsFile, FilterWindow} from "../types/status";
  import {WINDOW_CONFIGS} from "../types/status";
  import IncidentCard from "./IncidentCard.svelte";
  import IncidentFilterChips from "./IncidentFilterChips.svelte";

  interface Props {
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

  let nowTick = $state(Date.now());
  // null = "All" chip selected
  let selectedService: string | null = $state(null);
  let expandedId: string | null = $state(null);

  onMount(() => {
    const id = setInterval(() => { nowTick = Date.now(); }, 60_000);
    return () => clearInterval(id);
  });

  const RTF = new Intl.RelativeTimeFormat("en", {numeric: "auto"});
  const MONTH_FMT = new Intl.DateTimeFormat("en-US", {year: "numeric", month: "long"});

  function formatRelative(iso: string | undefined): string {
    void nowTick; // reactive dependency — re-evaluates every minute
    if (!iso) return "";
    const ms = nowTick - Date.parse(iso);
    if (!Number.isFinite(ms)) return "";
    const abs = Math.abs(ms);
    const sign = ms >= 0 ? -1 : 1; // past = negative
    const min = Math.round(abs / 60_000);
    if (min < 60) return RTF.format(sign * min, "minute");
    const hr = Math.round(abs / 3_600_000);
    if (hr < 24) return RTF.format(sign * hr, "hour");
    const day = Math.round(abs / 86_400_000);
    return RTF.format(sign * day, "day");
  }

  // When the window changes, reset the chip selection. Keeping it around can
  // show a misleadingly empty list if the previously-selected service has no
  // incidents inside the new window.
  $effect(() => {
    windowFilter; // track
    selectedService = null;
  });

  // All unique services appearing in the current incident set (regardless of window).
  // Stable alphabetical order so the chip strip doesn't reshuffle between renders.
  const serviceChips = $derived.by<readonly string[]>(() => {
    if (!incidents) return [];
    const set = new Set<string>();
    for (const inc of incidents.incidents) set.add(inc.service);
    return [...set].sort();
  });

  // "All" + each service name — used as the ordered list for roving tabindex.
  const allChips = $derived.by<readonly (string | null)[]>(() => [null, ...serviceChips]);

  const filtered = $derived.by<readonly Incident[]>(() => {
    if (!incidents) return [];
    const cutoffMs = Date.now() - WINDOW_CONFIGS[windowFilter].days * 86_400_000;
    return incidents.incidents
      .filter(inc =>
        Date.parse(inc.startedAt) >= cutoffMs
        && (selectedService === null || inc.service === selectedService),
      )
      // Defensive sort so month grouping stays correct even if upstream (e.g.
      // dev-mode mocks) forgets to sort by startedAt descending.
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  });

  // Group incidents by month label ("April 2026"). Preserves existing ordering of `filtered`
  // (newest first); only adds a header before the first incident of each group.
  interface MonthGroup {
    readonly label: string;
    readonly items: readonly Incident[];
  }
  const grouped = $derived.by<readonly MonthGroup[]>(() => {
    const groups: MonthGroup[] = [];
    let current: {label: string; items: Incident[]} | null = null;
    for (const inc of filtered) {
      const label = MONTH_FMT.format(new Date(inc.startedAt));
      if (!current || current.label !== label) {
        current = {label, items: [inc]};
        groups.push(current);
      } else {
        current.items.push(inc);
      }
    }
    return groups;
  });
</script>

<div class="incidents">
  <h2 class="heading">Recent incidents · last {windowFilter}</h2>
  {#if incidents && serviceChips.length > 0}
    <IncidentFilterChips
      chips={allChips}
      selected={selectedService}
      onSelect={(chip) => (selectedService = chip)}
    />
  {/if}
  {#if !incidents}
    <div class="placeholder">Loading incidents…</div>
  {:else if filtered.length === 0}
    <div class="placeholder">No incidents in this window. 🌿</div>
  {:else}
    {#each grouped as group (group.label)}
      <h3 class="month-header">{group.label}</h3>
      {#each group.items as inc (inc.id)}
        <IncidentCard
          incident={inc}
          expanded={expandedId === inc.id}
          onToggle={() => (expandedId = expandedId === inc.id ? null : inc.id)}
          {formatRelative}
        />
      {/each}
    {/each}
  {/if}
</div>

<style>
  .incidents { margin-top: var(--sp-xl); }
  .heading {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.01em;
    text-transform: lowercase;
    margin: 0 0 var(--sp-md) 0;
    color: var(--text);
  }
  .heading::before {
    content: "#";
    color: var(--accent);
    margin-right: 8px;
    font-weight: 600;
  }
  .month-header {
    font-family: var(--font-mono);
    font-weight: 400;
    font-size: 11px;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    text-transform: lowercase;
    margin: var(--sp-md) 0 var(--sp-xs) 0;
  }
  .month-header::before {
    content: "// ";
    color: var(--accent-dim);
  }
  .month-header:first-of-type { margin-top: 0; }
  .placeholder {
    padding: var(--sp-sm) var(--sp-md);
    color: var(--text-muted);
    font-size: var(--fs-sm);
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }
</style>
