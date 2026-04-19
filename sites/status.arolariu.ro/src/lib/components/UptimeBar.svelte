<script lang="ts">
  import type {Bucket} from "../types/status";

  interface Props {
    buckets: readonly Bucket[];
    variant?: "primary" | "sub";
    onSegmentHover: (bucket: Bucket | null, target: HTMLElement | null) => void;
  }

  let {buckets, variant = "primary", onSegmentHover}: Props = $props();

  function buildAriaLabel(b: Bucket): string {
    const date = new Date(b.t);
    const timeStr = date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const sub = b.worstSubCheck ? `, ${b.worstSubCheck.name} ${b.worstSubCheck.description ?? ""}` : "";
    return `${timeStr}, ${b.status}${sub}`;
  }

  function handleEnter(bucket: Bucket, event: Event) {
    onSegmentHover(bucket, event.currentTarget as HTMLElement);
  }

  function handleLeave() {
    onSegmentHover(null, null);
  }
</script>

<div class="bar" data-variant={variant}>
  {#each buckets as bucket (bucket.t)}
    <button
      type="button"
      class="seg seg-{bucket.status.toLowerCase()}"
      aria-label={buildAriaLabel(bucket)}
      onmouseenter={(e) => handleEnter(bucket, e)}
      onmouseleave={handleLeave}
      onfocus={(e) => handleEnter(bucket, e)}
      onblur={handleLeave}
    ></button>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    gap: 1px;
    height: 24px;
    align-items: stretch;
    position: relative;
  }
  .bar[data-variant="sub"] { height: 16px; }
  .seg {
    flex: 1;
    min-width: 3px;
    border: 0;
    padding: 0;
    border-radius: 1px;
    cursor: pointer;
    transition: transform .12s;
  }
  .seg:hover, .seg:focus-visible {
    transform: scaleY(1.15);
    outline: none;
  }
  .seg-healthy { background: var(--status-up); }
  .seg-degraded { background: var(--status-deg); }
  .seg-unhealthy { background: var(--status-down); }
  .bar[data-variant="sub"] .seg-healthy { opacity: 0.75; }
</style>
