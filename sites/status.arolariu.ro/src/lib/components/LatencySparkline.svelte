<script lang="ts">
  import type {Bucket} from "../types/status";

  interface Props {
    buckets: readonly Bucket[];
    width?: number;
    height?: number;
  }

  let {buckets, width = 60, height = 16}: Props = $props();

  const points = $derived.by(() => {
    if (buckets.length === 0) return "";
    const p50s = buckets.map(b => b.latency.p50);
    const max = Math.max(...p50s, 1);
    const min = Math.min(...p50s);
    const range = max - min || 1;
    return p50s.map((v, i) => {
      const x = (i / (buckets.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * height * 0.9 - height * 0.05;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  });

  const tier = $derived.by(() => {
    if (buckets.length === 0) return "fast";
    const last = buckets[buckets.length - 1].latency.p50;
    return last < 200 ? "fast" : last < 500 ? "ok" : "slow";
  });
</script>

<svg class="sparkline" viewBox="0 0 {width} {height}" preserveAspectRatio="none" aria-hidden="true">
  {#if points}
    <polyline class="path tier-{tier}" fill="none" stroke-width="1.2" points={points}/>
  {/if}
</svg>

<style>
  .sparkline {
    width: 100%;
    height: 100%;
    display: block;
  }
  .path.tier-fast { stroke: var(--status-up); }
  .path.tier-ok   { stroke: var(--text-muted); }
  .path.tier-slow { stroke: var(--status-deg); }
</style>
