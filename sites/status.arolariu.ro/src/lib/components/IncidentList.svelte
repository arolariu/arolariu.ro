<script lang="ts">
  import {onMount} from "svelte";
  import type {Incident, IncidentsFile, FilterWindow} from "../types/status";
  import {WINDOW_TO_DAYS} from "../types/status";
  import {formatDuration} from "../aggregation/formatDuration";

  interface Props {
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

  let nowTick = $state(Date.now());
  // null = "All" chip selected
  let selectedService: string | null = $state(null);

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
    const cutoffMs = Date.now() - WINDOW_TO_DAYS[windowFilter] * 86_400_000;
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

  function chipLabel(chip: string | null): string {
    return chip === null ? "All" : chip;
  }

  function selectChip(chip: string | null) {
    selectedService = chip;
  }

  function handleChipKeydown(event: KeyboardEvent, index: number) {
    const total = allChips.length;
    if (total <= 1) return;
    let newIndex = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        newIndex = (index + 1) % total;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        newIndex = (index - 1 + total) % total;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = total - 1;
        break;
      default:
        return; // Let Space/Enter bubble naturally
    }
    event.preventDefault();
    selectChip(allChips[newIndex] ?? null);
    // Focus the newly-selected chip for keyboard users.
    const container = (event.currentTarget as HTMLElement).parentElement;
    const target = container?.children[newIndex] as HTMLElement | undefined;
    target?.focus();
  }
</script>

<div class="incidents">
  <h2 class="heading">Recent incidents · last {windowFilter}</h2>
  {#if incidents && serviceChips.length > 0}
    <div class="filter-chips" role="radiogroup" aria-label="Filter incidents by service">
      {#each allChips as chip, i (chip ?? "__all__")}
        {@const active = selectedService === chip}
        <button
          type="button"
          role="radio"
          class="chip"
          class:active
          aria-checked={active}
          tabindex={active ? 0 : -1}
          onclick={() => selectChip(chip)}
          onkeydown={(e) => handleChipKeydown(e, i)}
        >
          {chipLabel(chip)}
        </button>
      {/each}
    </div>
  {/if}
  {#if !incidents}
    <div class="placeholder">Loading incidents…</div>
  {:else if filtered.length === 0}
    <div class="placeholder">No incidents in this window. 🌿</div>
  {:else}
    {#each grouped as group (group.label)}
      <h3 class="month-header">{group.label}</h3>
      {#each group.items as inc (inc.id)}
        <article class="item" data-status={inc.status}>
          <div class="item-rail" aria-hidden="true"></div>
          <div class="item-body">
            <div class="head">
              <strong class="service-name">{inc.service}{inc.subCheck ? ` · ${inc.subCheck}` : ""}</strong>
              <span class="pill pill-{inc.status}">{inc.status === "open" ? "Ongoing" : "Resolved"}</span>
              <span class="severity severity-{inc.severity.toLowerCase()}">{inc.severity}</span>
            </div>
            <div class="meta" title={inc.startedAt}>
              <span>Started {formatRelative(inc.startedAt)}</span>
              {#if inc.status === "resolved"}
                <span class="sep">·</span>
                <span>lasted {formatDuration(inc.durationMs)}</span>
              {/if}
              {#if inc.reason}
                <span class="sep">·</span>
                <code>{inc.reason}</code>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    {/each}
  {/if}
</div>

<style>
  .incidents { margin-top: var(--sp-lg); }
  .heading {
    font-size: var(--fs-xs);
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: var(--sp-sm);
    font-weight: 600;
  }
  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: var(--sp-sm);
  }
  .chip {
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    cursor: pointer;
    transition: color .12s, background .12s, border-color .12s;
  }
  .chip:hover { color: var(--text); }
  .chip:focus-visible {
    outline: 2px solid var(--status-up);
    outline-offset: 1px;
  }
  .chip.active {
    background: var(--surface-hover);
    color: var(--text);
    border-color: var(--border-strong);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .month-header {
    font-size: var(--fs-xs);
    opacity: 0.45;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    margin: var(--sp-sm) 0 var(--sp-xs) 0;
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
  .item {
    display: grid;
    grid-template-columns: 4px 1fr;
    gap: var(--sp-md);
    padding: var(--sp-sm) var(--sp-md);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-xs);
    overflow: hidden;
    position: relative;
  }
  .item-rail {
    background: var(--status-deg);
    border-radius: 4px;
  }
  .item[data-status="open"] .item-rail { background: var(--status-down); }
  .item-body { min-width: 0; }
  .head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-xs);
    margin-bottom: 4px;
  }
  .service-name {
    font-weight: 600;
    font-size: var(--fs-sm);
  }
  .pill {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .pill-open {
    background: var(--status-down-bg);
    color: var(--status-down);
    border: 1px solid var(--status-down-border);
  }
  .pill-resolved {
    background: var(--status-up-bg);
    color: var(--status-up);
    border: 1px solid var(--status-up-border);
  }
  .severity {
    font-size: 10px;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .severity-unhealthy { color: var(--status-down); }
  .severity-degraded { color: var(--status-deg); }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-2xs) var(--sp-xs);
    font-size: var(--fs-xs);
    opacity: 0.7;
  }
  .sep { opacity: 0.5; }
  code {
    background: var(--surface-hover);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10.5px;
  }
</style>
