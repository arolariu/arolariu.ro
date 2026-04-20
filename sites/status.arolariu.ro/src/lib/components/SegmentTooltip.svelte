<script lang="ts">
  import {onDestroy} from "svelte";
  import type {Bucket} from "../types/status";

  interface Props {
    bucket: Bucket | null;
    anchor: HTMLElement | null;
    id?: string;
  }

  let {bucket, anchor, id = `tooltip-${Math.random().toString(36).slice(2, 9)}`}: Props = $props();

  let position = $state({top: 0, left: 0, flipHoriz: false});
  let tooltipEl = $state<HTMLDivElement | null>(null);

  function updatePosition() {
    if (!anchor || !bucket) return;
    const rect = anchor.getBoundingClientRect();
    const tipWidth = tooltipEl?.offsetWidth ?? 260;
    const desiredLeft = rect.left + rect.width / 2 + window.scrollX;
    const viewportRight = window.scrollX + window.innerWidth - 8;
    const flipHoriz = desiredLeft + tipWidth / 2 > viewportRight;
    const clampedLeft = flipHoriz
      ? Math.min(desiredLeft, viewportRight - tipWidth / 2)
      : desiredLeft;
    position = {
      top: rect.top + window.scrollY - 8,
      left: clampedLeft,
      flipHoriz,
    };
  }

  $effect(() => {
    if (!anchor || !bucket) return;
    updatePosition();
    const opts: AddEventListenerOptions = {passive: true};
    window.addEventListener("scroll", updatePosition, opts);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    }
  });

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16).replace("T", " · ") + " UTC";
  }
</script>

{#if bucket}
  <div
    bind:this={tooltipEl}
    {id}
    class="tooltip"
    role="tooltip"
    style="top: {position.top}px; left: {position.left}px;"
  >
    <div class="head">
      <span class="time">{formatTime(bucket.t)}</span>
      <span class="badge badge-{bucket.status.toLowerCase()}">{bucket.status}</span>
    </div>
    <div class="row"><span class="k">HTTP</span><span class="v">{bucket.httpStatus ?? "—"}</span></div>
    <div class="row"><span class="k">p50 latency</span><span class="v">{bucket.latency.p50} ms</span></div>
    <div class="row"><span class="k">p99 latency</span><span class="v">{bucket.latency.p99} ms</span></div>
    <div class="row"><span class="k">Probes</span><span class="v">{bucket.probes.healthy} / {bucket.probes.total}</span></div>
    {#if bucket.worstSubCheck}
      <div class="reason">
        <strong>{bucket.worstSubCheck.name}</strong> reported <em>{bucket.worstSubCheck.status}</em>
        {#if bucket.worstSubCheck.description}: {bucket.worstSubCheck.description}{/if}
      </div>
    {/if}
    <span class="arrow" aria-hidden="true"></span>
  </div>
{/if}

<style>
  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: var(--sp-sm) var(--sp-md);
    min-width: 260px;
    max-width: min(340px, calc(100vw - 16px));
    box-shadow: var(--shadow-tooltip);
    font-size: var(--fs-xs);
    z-index: var(--z-tooltip);
    pointer-events: none;
  }
  .arrow {
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 10px;
    height: 10px;
    background: var(--bg);
    border-right: 1px solid var(--border-strong);
    border-bottom: 1px solid var(--border-strong);
    transform: translateX(-50%) rotate(45deg);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-sm);
    padding-bottom: var(--sp-xs);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--sp-xs);
  }
  .time { font-weight: 500; }
  .badge {
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
  .badge-healthy { background: var(--status-up-bg); color: var(--status-up); border: 1px solid var(--status-up-border); }
  .badge-degraded { background: var(--status-deg-bg); color: var(--status-deg); border: 1px solid var(--status-deg-border); }
  .badge-unhealthy { background: var(--status-down-bg); color: var(--status-down); border: 1px solid var(--status-down-border); }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .k { opacity: 0.55; }
  .v { font-variant-numeric: tabular-nums; }
  .reason {
    margin-top: var(--sp-xs);
    padding-top: var(--sp-xs);
    border-top: 1px dashed var(--border);
    color: var(--status-deg);
    line-height: 1.4;
  }
</style>
