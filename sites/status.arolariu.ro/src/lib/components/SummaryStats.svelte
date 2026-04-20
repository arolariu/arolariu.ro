<script lang="ts">
  import type {FilterWindow, IncidentsFile, ServiceSeries} from "../types/status";
  import OverallUptimeCard from "./OverallUptimeCard.svelte";
  import AvgLatencyCard from "./AvgLatencyCard.svelte";
  import IncidentsCard from "./IncidentsCard.svelte";
  import MttrCard from "./MttrCard.svelte";

  interface Props {
    services: readonly ServiceSeries[];
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {services, incidents, windowFilter}: Props = $props();
</script>

<section class="summary-stats" data-testid="summary-stats" aria-label="Summary statistics">
  <OverallUptimeCard {services} {windowFilter} />
  <AvgLatencyCard {services} />
  <IncidentsCard {incidents} {windowFilter} />
  <MttrCard {incidents} {windowFilter} />
</section>

<style>
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-bottom: var(--sp-xl);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  /*
   * Shared card shell, targeted via :global() so the four child components
   * each render a pure `<dl class="card">` and pick up the styling from here.
   * Scoped to `.summary-stats` ancestor so the globals don't bleed.
   */
  .summary-stats :global(.card) {
    background: transparent;
    border: 0;
    border-right: 1px solid var(--border);
    border-radius: 0;
    padding: var(--sp-md);
    margin: 0;
    position: relative;
    animation: consolePrint 500ms cubic-bezier(0.2, 0, 0, 1) both;
  }
  .summary-stats :global(> .card:last-child) { border-right: 0; }
  .summary-stats :global(> .card:nth-child(1)) { animation-delay: 60ms; }
  .summary-stats :global(> .card:nth-child(2)) { animation-delay: 120ms; }
  .summary-stats :global(> .card:nth-child(3)) { animation-delay: 180ms; }
  .summary-stats :global(> .card:nth-child(4)) { animation-delay: 240ms; }

  .summary-stats :global(.card dt) {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 400;
    text-transform: lowercase;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    margin-bottom: 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .summary-stats :global(.card dt::before) {
    content: "//";
    color: var(--accent-dim);
    margin-right: 2px;
    font-weight: 500;
  }
  .summary-stats :global(.card .value) {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-hero);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .summary-stats :global(.card .value.tier-fast) { color: var(--status-up); }
  .summary-stats :global(.card .value.tier-ok)   { color: var(--text); }
  .summary-stats :global(.card .value.tier-slow) { color: var(--status-deg); }
  .summary-stats :global(.card .sub) {
    margin: 10px 0 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.01em;
  }
  .summary-stats :global(.card .worst) {
    margin: 10px 0 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    padding-top: 8px;
    letter-spacing: 0.01em;
  }
  .summary-stats :global(.card .worst strong) {
    font-weight: 500;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  @container statusPage (max-width: 640px) {
    .summary-stats {
      grid-template-columns: repeat(2, 1fr);
      border-left: 0;
      border-right: 0;
    }
    .summary-stats :global(> .card) { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .summary-stats :global(> .card:nth-child(2n)) { border-right: 0; }
    .summary-stats :global(> .card:nth-child(n+3)) { border-bottom: 0; }
  }
</style>
