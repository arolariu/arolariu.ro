<script lang="ts">
  import {onMount} from "svelte";
  import type {Incident, IncidentsFile, FilterWindow} from "../types/status";
  import {WINDOW_TO_DAYS} from "../types/status";

  interface Props {
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

  let nowTick = $state(Date.now());

  onMount(() => {
    const id = setInterval(() => { nowTick = Date.now(); }, 60_000);
    return () => clearInterval(id);
  });

  const RTF = new Intl.RelativeTimeFormat("en", {numeric: "auto"});

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

  function formatDuration(ms: number | undefined): string {
    if (!ms || !Number.isFinite(ms)) return "—";
    const min = Math.round(ms / 60_000);
    if (min < 60) return `${min} min`;
    const hr = Math.floor(min / 60);
    const rem = min % 60;
    return rem === 0 ? `${hr} h` : `${hr} h ${rem} min`;
  }

  const filtered = $derived.by<readonly Incident[]>(() => {
    if (!incidents) return [];
    const cutoffMs = Date.now() - WINDOW_TO_DAYS[windowFilter] * 86_400_000;
    return incidents.incidents.filter(inc => Date.parse(inc.startedAt) >= cutoffMs);
  });
</script>

<div class="incidents">
  <h2 class="heading">Recent incidents · last {windowFilter}</h2>
  {#if !incidents}
    <div class="placeholder">Loading incidents…</div>
  {:else if filtered.length === 0}
    <div class="placeholder">No incidents in this window. 🌿</div>
  {:else}
    {#each filtered as inc (inc.id)}
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
