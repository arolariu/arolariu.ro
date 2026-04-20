<script lang="ts">
  import {onMount} from "svelte";
  import type {Incident, IncidentsFile, FilterWindow} from "../types/status";
  import {WINDOW_TO_DAYS} from "../types/status";
  import {formatDuration} from "../aggregation/formatDuration";
  import IncidentDetail from "./IncidentDetail.svelte";

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
          <button
            type="button"
            class="item-head"
            aria-expanded={expandedId === inc.id}
            aria-controls={`incident-detail-${inc.id}`}
            onclick={() => (expandedId = expandedId === inc.id ? null : inc.id)}
          >
            <div class="item-rail" aria-hidden="true"></div>
            <div class="item-body">
              <div class="head">
                <strong class="service-name">{inc.service}{inc.subCheck ? ` · ${inc.subCheck}` : ""}</strong>
                <span class="pill pill-{inc.status}">{inc.status === "open" ? "Ongoing" : "Resolved"}</span>
                <span class="severity severity-{inc.severity.toLowerCase()}">{inc.severity}</span>
                <span class="chevron" aria-hidden="true">{expandedId === inc.id ? "▾" : "▸"}</span>
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
          </button>
          {#if expandedId === inc.id}
            <div id={`incident-detail-${inc.id}`} class="item-detail-wrap">
              <IncidentDetail incident={inc} />
            </div>
          {/if}
        </article>
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
  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
    margin-bottom: var(--sp-md);
    padding-bottom: var(--sp-sm);
    border-bottom: 1px solid var(--border);
  }
  .chip {
    padding: 3px 8px;
    border: 0;
    border-bottom: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.02em;
    line-height: 1.4;
    cursor: pointer;
    transition: color .15s ease, border-color .15s ease;
  }
  .chip:hover { color: var(--text); }
  .chip:focus-visible {
    outline: 0;
    color: var(--text);
    border-bottom-color: var(--accent);
  }
  .chip.active {
    background: transparent;
    color: var(--text);
    font-weight: 500;
    border-bottom-color: var(--accent);
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
  .item {
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    margin-bottom: 0;
    overflow: hidden;
    position: relative;
  }
  .item:last-child { border-bottom: 0; }
  .item-head {
    all: unset;
    display: grid;
    grid-template-columns: 2px 1fr;
    gap: var(--sp-md);
    padding: var(--sp-md);
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    transition: background 0.18s ease;
  }
  .item-head:focus-visible {
    outline: 0;
    background: var(--surface-hover);
  }
  .item-head:hover { background: var(--surface-hover); }
  .item-rail {
    background: var(--status-deg);
    border-radius: 4px;
  }
  .item[data-status="open"] .item-rail { background: var(--status-down); }
  .item-body { min-width: 0; }
  .chevron {
    margin-left: auto;
    opacity: 0.5;
    font-size: 11px;
  }
  .item-detail-wrap {
    padding: 0 var(--sp-md) var(--sp-sm);
  }
  .head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-xs);
    margin-bottom: 4px;
  }
  .service-name {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 12.5px;
    letter-spacing: 0.005em;
    color: var(--text);
  }
  .pill {
    padding: 1px 6px;
    border-radius: 2px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: transparent;
    border: 1px solid currentColor;
  }
  .pill-open    { color: var(--status-down); }
  .pill-resolved { color: var(--status-up); }
  .severity {
    font-family: var(--font-body);
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 500;
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
