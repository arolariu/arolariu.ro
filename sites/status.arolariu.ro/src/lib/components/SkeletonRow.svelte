<script lang="ts">
  interface Props {
    segmentCount?: number;
    indent?: boolean;
  }
  let {segmentCount = 48, indent = false}: Props = $props();
  const segments = Array.from({length: segmentCount}, (_, i) => i);
</script>

<div class="skeleton-row" class:indent data-testid="skeleton-row">
  <div class="shimmer name"></div>
  <div class="bar">
    {#each segments as i (i)}
      <div class="shimmer seg"></div>
    {/each}
  </div>
  <div class="shimmer uptime"></div>
  <div class="shimmer latency"></div>
</div>

<style>
  .skeleton-row {
    display: grid;
    grid-template-columns: 1.4fr 2.2fr 80px 100px;
    gap: 14px;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }
  .skeleton-row > * { min-width: 0; }
  .skeleton-row.indent { padding-left: 40px; }
  .shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.08) 50%,
      rgba(255, 255, 255, 0.04) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
    border-radius: 3px;
  }
  .name   { height: 14px; width: 60%; }
  .uptime { height: 14px; width: 100%; }
  .latency{ height: 14px; width: 100%; }
  .bar { display: flex; gap: 1px; height: 24px; min-width: 0; }
  .seg { flex: 1 1 0; min-width: 0; height: 100%; }
</style>
