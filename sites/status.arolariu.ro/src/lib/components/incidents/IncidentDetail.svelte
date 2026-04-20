<script lang="ts">
  /**
   * IncidentDetail
   * --------------
   * Structured readout of an incident (rendered inside an expanded
   * {@link IncidentCard}). Two-column grid: a `<dl>` of timestamps +
   * metadata on the left, the full reason/stacktrace pre-block on the
   * right. Collapses to a single column on narrow viewports.
   */
  import type {Incident} from "../../types/status";
  import {formatDuration} from "../../aggregation/formatDuration";

  /** Props for the {@link IncidentDetail} component. */
  interface Props {
    /** Incident to render. Resolved incidents gain the "Resolved" + concrete duration rows. */
    incident: Incident;
  }

  let {incident}: Props = $props();

  const startedAt = $derived(new Date(incident.startedAt));
  const resolvedAt = $derived(
    incident.status === "resolved" ? new Date(incident.resolvedAt) : null,
  );
  // "ongoing" when open so the duration column still renders a meaningful
  // value rather than an em-dash.
  const durationText = $derived(
    incident.status === "resolved" ? formatDuration(incident.durationMs) : "ongoing",
  );
</script>

<div class="detail" role="region" aria-label="Incident detail">
  <dl>
    <div class="row">
      <dt>Started</dt>
      <dd>
        <time datetime={incident.startedAt}
          >{startedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time
        >
      </dd>
    </div>
    {#if resolvedAt && incident.status === "resolved"}
      <div class="row">
        <dt>Resolved</dt>
        <dd>
          <time datetime={incident.resolvedAt}
            >{resolvedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time
          >
        </dd>
      </div>
    {/if}
    <div class="row">
      <dt>Duration</dt>
      <dd>{durationText}</dd>
    </div>
    <div class="row">
      <dt>Severity</dt>
      <dd>{incident.severity}</dd>
    </div>
    {#if incident.subCheck}
      <div class="row">
        <dt>Sub-check</dt>
        <dd><code>{incident.subCheck}</code></dd>
      </div>
    {/if}
    <div class="row">
      <dt>Failed probes</dt>
      <dd>{incident.probeCount}</dd>
    </div>
  </dl>
  <div class="reason-full">
    <div class="label">Reason</div>
    <pre><code>{incident.reason}</code></pre>
  </div>
</div>

<style>
  .detail {
    margin-top: 8px;
    padding: 10px 12px;
    background: var(--surface-hover, var(--surface-raised, rgba(255, 255, 255, 0.02)));
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, 4px);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    font-size: var(--fs-xs);
  }
  .row {
    display: contents;
  }
  dt {
    margin: 0;
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 10px;
    padding-top: 3px;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .reason-full {
    align-self: start;
  }
  .label {
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 10px;
    margin-bottom: 4px;
  }
  pre {
    margin: 0;
    padding: 6px 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 11.5px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, monospace;
  }

  @container statusPage (max-width: 640px) {
    .detail {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }
</style>
