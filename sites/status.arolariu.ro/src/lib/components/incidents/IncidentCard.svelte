<script lang="ts">
  import type {Incident} from "../../types/status";
  import {formatDuration} from "../../aggregation/formatDuration";
  import IncidentDetail from "./IncidentDetail.svelte";

  interface Props {
    incident: Incident;
    expanded: boolean;
    onToggle: () => void;
    /** Caller-supplied relative-time formatter so the nowTick reactive
     *  dependency lives with the list, not per-card. */
    formatRelative: (iso: string | undefined) => string;
  }

  let {incident, expanded, onToggle, formatRelative}: Props = $props();
</script>

<article class="item" data-status={incident.status}>
  <button
    type="button"
    class="item-head"
    aria-expanded={expanded}
    aria-controls={`incident-detail-${incident.id}`}
    onclick={onToggle}
  >
    <div class="item-rail" aria-hidden="true"></div>
    <div class="item-body">
      <div class="head">
        <strong class="service-name">{incident.service}{incident.subCheck ? ` · ${incident.subCheck}` : ""}</strong>
        <span class="pill pill-{incident.status}">{incident.status === "open" ? "Ongoing" : "Resolved"}</span>
        <span class="severity severity-{incident.severity.toLowerCase()}">{incident.severity}</span>
        <span class="chevron" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
      </div>
      <div class="meta" title={incident.startedAt}>
        <span>Started {formatRelative(incident.startedAt)}</span>
        {#if incident.status === "resolved"}
          <span class="sep">·</span>
          <span>lasted {formatDuration(incident.durationMs)}</span>
        {/if}
        {#if incident.reason}
          <span class="sep">·</span>
          <code>{incident.reason}</code>
        {/if}
      </div>
    </div>
  </button>
  {#if expanded}
    <div id={`incident-detail-${incident.id}`} class="item-detail-wrap">
      <IncidentDetail {incident} />
    </div>
  {/if}
</article>

<style>
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
