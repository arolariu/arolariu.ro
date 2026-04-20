<script lang="ts">
  import type {ServiceSeries} from "../types/status";
  import {computeWeekdayUptime} from "../aggregation/weekdayUptime";

  interface Props {
    services: readonly ServiceSeries[];
  }

  let {services}: Props = $props();

  const values = $derived(computeWeekdayUptime(services));
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  const W = 240;
  const H = 80;
  const BAR_W = (W - 6 * 4) / 7;

  function tierColor(v: number): string {
    if (v >= 99.9) return "var(--status-up)";
    if (v >= 99) return "var(--status-deg)";
    return "var(--status-down)";
  }

  function barHeight(v: number): number {
    // Min 2px so the bar is always visible, even for 0%. Max at H.
    return Math.max(2, (v / 100) * H);
  }

  const desc = $derived(
    "Uptime by weekday: " + values.map((v, i) => `${labels[i]} ${v}%`).join(", ")
  );
</script>

<section class="weekday-chart" aria-label="Uptime by weekday">
  <header>
    <h2>Uptime by weekday</h2>
    <p class="sub">Aggregate across all services · window decides data range</p>
  </header>
  <svg viewBox="0 0 {W} {H + 18}" role="img" aria-label="Uptime by weekday bar chart">
    <desc>{desc}</desc>
    {#each values as v, i (i)}
      <g>
        <rect
          x={i * (BAR_W + 4)}
          y={H - barHeight(v)}
          width={BAR_W}
          height={barHeight(v)}
          fill={tierColor(v)}
          rx="1"
        >
          <title>{labels[i]} · {v}% uptime</title>
        </rect>
        <text
          x={i * (BAR_W + 4) + BAR_W / 2}
          y={H + 14}
          text-anchor="middle"
          fill="var(--text-muted, var(--text))"
          font-size="10"
        >{labels[i]}</text>
      </g>
    {/each}
  </svg>
</section>

<style>
  .weekday-chart {
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
  svg {
    max-width: 280px;
    display: block;
  }
</style>
