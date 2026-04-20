<script lang="ts">
  /**
   * SkeletonRow
   * -----------
   * Shimmer placeholder that mirrors the {@link ServiceRow} grid layout
   * while data is loading. Matches the real row's `grid-template-areas` so
   * column widths stay stable when the skeletons are swapped out for
   * populated rows (no layout shift on load).
   *
   * Shimmer animates a moving-gradient background; suppressed under
   * `prefers-reduced-motion` via the shared `.shimmer` utility.
   */
  interface Props {
    /** Number of pseudo-segments in the uptime-bar slot. 48 ≈ a 1-day fine grid. */
    segmentCount?: number;
    /** Indent to match a sub-service row. */
    indent?: boolean;
  }
  let {segmentCount = 48, indent = false}: Props = $props();
  const segments = Array.from({length: segmentCount}, (_, i) => i);
</script>

<div class="skeleton-row" class:indent data-testid="skeleton-row">
  <div class="shimmer name"></div>
  <div class="shimmer sparkline"></div>
  <div class="bar-cell">
    <div class="bar">
      {#each segments as i (i)}
        <div class="shimmer seg"></div>
      {/each}
    </div>
  </div>
  <div class="shimmer uptime"></div>
  <div class="shimmer latency"></div>
</div>

<style>
  .skeleton-row {
    display: grid;
    grid-template-columns: var(--status-table-grid);
    grid-template-areas: "name sparkline bar uptime latency";
    gap: var(--sp-sm);
    align-items: center;
    padding: var(--sp-sm) var(--sp-md);
    border-bottom: 1px solid var(--border);
  }
  .skeleton-row > * { min-width: 0; }
  .skeleton-row .name { grid-area: name; }
  .skeleton-row .sparkline { grid-area: sparkline; height: 14px; width: 100%; }
  .skeleton-row .bar-cell { grid-area: bar; min-width: 0; }
  .skeleton-row .uptime { grid-area: uptime; }
  .skeleton-row .latency { grid-area: latency; }
  .skeleton-row.indent { padding-left: 40px; }
  .shimmer {
    background: linear-gradient(
      90deg,
      var(--surface-hover) 0%,
      var(--border) 50%,
      var(--surface-hover) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
    border-radius: 3px;
  }
  .name   { height: 14px; width: 60%; }
  .uptime { height: 14px; width: 100%; }
  .latency{ height: 14px; width: 100%; }
  .bar { display: flex; gap: 1px; height: 24px; min-width: 0; width: 100%; }
  .seg { flex: 1 1 0; min-width: 0; height: 100%; }

  @container statusPage (max-width: 640px) {
    .skeleton-row {
      grid-template-columns: 1fr auto auto;
      grid-template-areas:
        "name uptime latency"
        "bar  bar    bar";
      gap: var(--sp-xs) var(--sp-sm);
      padding-block: var(--sp-md);
    }
    .skeleton-row .sparkline { display: none; }
  }
</style>
