<script lang="ts">
  import type {ServiceSeries, Bucket} from "../types/status";

  interface Props {
    services: readonly ServiceSeries[];
  }

  let {services}: Props = $props();

  function tierOf(p50: number): "fast" | "ok" | "slow" {
    return p50 < 200 ? "fast" : p50 < 500 ? "ok" : "slow";
  }

  function labelFor(svc: string, b: Bucket): string {
    const ts = new Date(b.t).toISOString().slice(0, 16).replace("T", " ") + " UTC";
    return `${svc} · ${ts} · p50 ${b.latency.p50}ms · p99 ${b.latency.p99}ms`;
  }
</script>

<section class="heatstrip" aria-label="Latency heatstrip per service">
  <header>
    <h2>Latency heatstrip</h2>
    <p class="sub">p50 per bucket, colored by speed tier</p>
  </header>
  <div class="rows">
    {#each services as svc (svc.service)}
      <div class="row">
        <span class="name">{svc.service}</span>
        <div class="strip">
          {#each svc.buckets as b (b.t)}
            <button
              type="button"
              class="cell cell-{tierOf(b.latency.p50)}"
              aria-label={labelFor(svc.service, b)}
              title={labelFor(svc.service, b)}
            ></button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <footer>
    <span class="legend legend-fast"></span> &lt; 200 ms
    <span class="legend legend-ok"></span> &lt; 500 ms
    <span class="legend legend-slow"></span> ≥ 500 ms
  </footer>
</section>

<style>
  .heatstrip {
    margin-top: var(--sp-md);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md, 6px);
    padding: var(--sp-sm) var(--sp-md);
  }
  header h2 {
    margin: 0;
    font-size: var(--fs-lg);
  }
  header .sub {
    margin: 0 0 var(--sp-sm);
    font-size: var(--fs-xs);
    opacity: 0.6;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(8rem, 0.4fr) 1fr;
    align-items: center;
    gap: var(--sp-sm);
    padding: 4px 0;
    border-bottom: 1px dashed var(--border);
  }
  .row:last-child {
    border-bottom: 0;
  }
  .name {
    font-size: var(--fs-sm);
    font-weight: 500;
  }
  .strip {
    display: flex;
    gap: 2px;
    height: 14px;
    min-width: 0;
  }
  .cell {
    flex: 1 1 0;
    min-width: 0;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .cell:hover {
    filter: brightness(1.2);
  }
  .cell:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .cell-fast {
    background: var(--status-up);
  }
  .cell-ok {
    background: var(--status-deg);
  }
  .cell-slow {
    background: var(--status-down);
  }
  footer {
    display: flex;
    gap: 10px;
    font-size: var(--fs-xs);
    opacity: 0.7;
    margin-top: var(--sp-sm);
    padding-top: 6px;
    border-top: 1px dashed var(--border);
    align-items: center;
  }
  .legend {
    display: inline-block;
    width: 12px;
    height: 10px;
    border-radius: 2px;
    margin-left: 6px;
  }
  .legend-fast {
    background: var(--status-up);
  }
  .legend-ok {
    background: var(--status-deg);
  }
  .legend-slow {
    background: var(--status-down);
  }
</style>
