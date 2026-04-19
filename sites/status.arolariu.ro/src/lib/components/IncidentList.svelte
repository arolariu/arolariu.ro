<script lang="ts">
  import type {Incident, IncidentsFile, FilterWindow} from "../types/status";
  import {WINDOW_TO_DAYS} from "../types/status";

  interface Props {
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

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
    <div class="placeholder">No incidents in this window.</div>
  {:else}
    {#each filtered as inc (inc.id)}
      <div class="item" data-status={inc.status}>
        <div class="head">
          <strong>{inc.service}{inc.subCheck ? ` · ${inc.subCheck}` : ""}</strong>
          — {inc.severity} ({inc.status})
        </div>
        <div class="meta">
          {inc.startedAt}
          {#if inc.resolvedAt}→ {inc.resolvedAt} · {formatDuration(inc.durationMs)}{:else}· ongoing{/if}
          {#if inc.reason}· <code>{inc.reason}</code>{/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .incidents { margin-top: 32px; }
  .heading {
    font-size: 11px;
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
    font-weight: 600;
  }
  .placeholder {
    padding: 12px;
    color: var(--text-muted);
    font-size: 12px;
  }
  .item {
    padding: 12px 16px;
    border-left: 3px solid var(--status-deg);
    background: var(--status-deg-bg);
    border-radius: 0 6px 6px 0;
    margin-bottom: 6px;
    font-size: 12px;
  }
  .item[data-status="open"] {
    border-left-color: var(--status-down);
    background: var(--status-down-bg);
  }
  .head { font-weight: 500; margin-bottom: 3px; }
  .meta { opacity: 0.65; font-size: 11px; }
  code {
    background: var(--surface-hover);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10.5px;
  }
</style>
