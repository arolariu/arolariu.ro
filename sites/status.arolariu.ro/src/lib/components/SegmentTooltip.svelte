<script lang="ts">
  import {onDestroy} from "svelte";
  import type {Bucket} from "../types/status";

  interface Props {
    bucket: Bucket | null;
    anchor: HTMLElement | null;
    id?: string;
    bucketDurationMs?: number;
  }

  const DEFAULT_DURATION = 30 * 60_000;

  let {
    bucket,
    anchor,
    id = `tooltip-${Math.random().toString(36).slice(2, 9)}`,
    bucketDurationMs = DEFAULT_DURATION,
  }: Props = $props();

  let position = $state({top: 0, left: 0, flipHoriz: false});
  let tooltipEl = $state<HTMLDivElement | null>(null);

  function updatePosition() {
    if (!anchor || !bucket) return;
    const rect = anchor.getBoundingClientRect();
    const tipWidth = tooltipEl?.offsetWidth ?? 280;
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

  const endISO = $derived.by(() => {
    if (!bucket) return "";
    // Merged (downsampled) buckets carry `spanMs`; prefer that over the base
    // bucketDurationMs so the tooltip shows the true end-of-range.
    const span = bucket.spanMs ?? bucketDurationMs;
    return new Date(Date.parse(bucket.t) + span).toISOString();
  });

  function formatTime(iso: string): string {
    if (!iso) return "—";
    return new Date(iso).toISOString().slice(0, 16).replace("T", " · ") + " UTC";
  }

  function formatRelativeAge(iso: string): string {
    const ms = Date.now() - Date.parse(iso);
    if (!Number.isFinite(ms) || ms < 0) return "upcoming";
    const min = Math.round(ms / 60_000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(ms / 3_600_000);
    if (hr < 24) return `${hr} h ago`;
    return `${Math.round(ms / 86_400_000)} d ago`;
  }

  // Latency visualization scale: clamp at max(500, p99)
  const scale = $derived(bucket ? Math.max(500, bucket.latency.p99) : 500);
  const p50Pct = $derived(bucket ? Math.min(100, (bucket.latency.p50 / scale) * 100) : 0);
  const p99Pct = $derived(bucket ? Math.min(100, (bucket.latency.p99 / scale) * 100) : 0);
</script>

{#if bucket}
  <div
    bind:this={tooltipEl}
    {id}
    class="tooltip"
    role="tooltip"
    style="top: {position.top}px; left: {position.left}px;"
  >
    <header class="tip-head">
      <div class="time-range">
        <span class="time-primary">{formatTime(bucket.t)}</span>
        <span class="time-arrow">→</span>
        <span class="time-secondary">{formatTime(endISO)}</span>
      </div>
      <span class="badge badge-{bucket.status.toLowerCase()}">{bucket.status}</span>
    </header>

    <div class="rel-age">{formatRelativeAge(bucket.t)}</div>

    <dl class="tip-grid">
      <dt>HTTP</dt>
      <dd class="mono">{bucket.httpStatus ?? "—"}</dd>

      <dt>Probes</dt>
      <dd>
        <span class="mono">{bucket.probes.healthy}</span>
        <span class="faint">/ {bucket.probes.total}</span>
        {#if bucket.probes.total > 0}
          <span class="detail">· samples</span>
        {/if}
      </dd>
    </dl>

    <div class="latency-viz">
      <div class="latency-label">Latency</div>
      <div class="latency-bar">
        <div class="latency-p99" style="width: {p99Pct}%"></div>
        <div class="latency-p50" style="left: {p50Pct}%"></div>
      </div>
      <div class="latency-numbers">
        <span class="mono">{bucket.latency.p50}</span>
        <span class="faint"> · {bucket.latency.p99} ms</span>
      </div>
    </div>

    {#if bucket.worstSubCheck}
      <div class="reason">
        <strong>{bucket.worstSubCheck.name}</strong> <em>{bucket.worstSubCheck.status}</em>
        {#if bucket.worstSubCheck.description} — {bucket.worstSubCheck.description}{/if}
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
    min-width: 280px;
    max-width: min(360px, calc(100vw - 16px));
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

  .tip-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-sm);
    padding-bottom: var(--sp-xs);
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .time-range {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-weight: 500;
    font-size: var(--fs-xs);
    flex-wrap: wrap;
  }
  .time-arrow { opacity: 0.4; }
  .time-secondary { opacity: 0.75; }

  .badge {
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .badge-healthy { background: var(--status-up-bg); color: var(--status-up); border: 1px solid var(--status-up-border); }
  .badge-degraded { background: var(--status-deg-bg); color: var(--status-deg); border: 1px solid var(--status-deg-border); }
  .badge-unhealthy { background: var(--status-down-bg); color: var(--status-down); border: 1px solid var(--status-down-border); }

  .rel-age {
    font-size: 10px;
    opacity: 0.5;
    margin-bottom: var(--sp-xs);
  }

  .tip-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px var(--sp-sm);
    margin: 0 0 var(--sp-xs) 0;
    padding: 0;
  }
  .tip-grid dt { opacity: 0.55; }
  .tip-grid dd { margin: 0; text-align: right; }
  .mono { font-variant-numeric: tabular-nums; }
  .faint { opacity: 0.5; }
  .detail { opacity: 0.6; font-size: 10px; }

  .latency-viz {
    margin: var(--sp-xs) 0;
    padding: var(--sp-xs) 0;
    border-top: 1px dashed var(--border);
    border-bottom: 1px dashed var(--border);
  }
  .latency-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.5;
    margin-bottom: 4px;
  }
  .latency-bar {
    position: relative;
    height: 6px;
    background: var(--surface-hover);
    border-radius: 3px;
    overflow: visible;
  }
  .latency-p99 {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, var(--status-deg));
    opacity: 0.5;
    border-radius: 3px;
  }
  .latency-p50 {
    position: absolute;
    top: -2px;
    width: 3px;
    height: 10px;
    background: var(--status-up);
    border-radius: 2px;
    transform: translateX(-50%);
  }
  .latency-numbers {
    margin-top: 3px;
    font-size: 10px;
    display: flex;
    gap: 2px;
  }

  .reason {
    margin-top: var(--sp-xs);
    padding-top: var(--sp-xs);
    border-top: 1px dashed var(--border);
    color: var(--status-deg);
    font-size: 11px;
    line-height: 1.4;
  }
</style>
