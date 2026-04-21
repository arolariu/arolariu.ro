<script lang="ts">
  /**
   * Top-of-page "all systems operational / some systems degraded / major
   * outage / loading" banner. The icon, color band, and title copy are
   * all driven from `overallStatus`, and the "last probe · Xm ago" meta
   * ticks once per minute via `useMinuteTick` so it stays fresh without
   * the parent having to force re-renders. Uses `role="status"` +
   * `aria-live="polite"` so AT users hear health transitions.
   */
  import type {HealthStatus} from "../../types/status";
  import {formatRelativeTime} from "../../aggregation/formatRelativeTime";
  import {useMinuteTick} from "../../hooks/useMinuteTick.svelte";

  interface Props {
    /** Aggregated health across all services, or "loading" while the first probe lands. */
    overallStatus: HealthStatus | "loading";
    /** ISO timestamp of the most recent probe; used to render the "Xm ago" meta. */
    lastProbeAt?: string | undefined;
  }

  let {overallStatus, lastProbeAt}: Props = $props();

  /** Reactive accessor that re-fires roughly every minute, driving the relative-time label. */
  const nowTick = useMinuteTick();

  /** Headline copy derived from the aggregate health state. */
  const title = $derived(
    overallStatus === "Healthy" ? "All systems operational"
    : overallStatus === "Degraded" ? "Some systems degraded"
    : overallStatus === "Unhealthy" ? "Major service outage"
    : "Loading status…"
  );

  /**
   * Humanized "Xm ago" for the last probe. Suppressed entirely when the
   * formatter returns "upcoming" (which happens if the timestamp is
   * slightly in the future due to clock skew) so we don't flash a
   * nonsense value.
   */
  const lastProbeAgo = $derived.by(() => {
    const out = formatRelativeTime(lastProbeAt, nowTick());
    return out === "upcoming" ? "" : out;
  });
</script>

<div class="banner banner-{overallStatus.toLowerCase()}" role="status" aria-live="polite">
  <span class="icon" aria-hidden="true">
    {#if overallStatus === "Healthy"}
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="8"/>
        <path d="M6.5 10.5l2.5 2.5 4.5-5"/>
      </svg>
    {:else if overallStatus === "Degraded"}
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 3l8 14H2z"/>
        <path d="M10 9v3"/>
        <circle cx="10" cy="14.5" r="0.6" fill="currentColor"/>
      </svg>
    {:else if overallStatus === "Unhealthy"}
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10" cy="10" r="8"/>
        <path d="M7 7l6 6M13 7l-6 6"/>
      </svg>
    {:else}
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="10" cy="10" r="8" opacity="0.3"/>
        <path d="M10 4a6 6 0 0 1 6 6" class="spinner"/>
      </svg>
    {/if}
  </span>
  <div class="body">
    <div class="title">{title}</div>
    {#if lastProbeAgo}
      <div class="meta label-comment">Last probe · {lastProbeAgo}</div>
    {/if}
  </div>
</div>

<style>
  /* Banner shell: the `color` property carries the status hue so the left
     border (`currentColor`) and the `>` glyph pick it up for free. */
  .banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--sp-sm) var(--sp-md);
    border-radius: 0;
    border: 1px solid var(--border);
    border-left: 2px solid currentColor;
    margin-bottom: var(--sp-xl);
    background: transparent;
    color: var(--status-up);
    animation: consolePrint 500ms cubic-bezier(0.2, 0, 0, 1) 80ms both;
  }
  /* Status-driven color variants. */
  .banner-degraded { color: var(--status-deg); }
  .banner-unhealthy { color: var(--status-down); }
  .banner-loading { color: var(--text-muted); }

  /* Icon slot + spinner for the loading variant. */
  .icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
  .icon .spinner { animation: spin 1.2s linear infinite; transform-origin: 10px 10px; }
  /* Text block: headline + meta line, allowed to wrap at narrow widths. */
  .body {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex: 1;
    flex-wrap: wrap;
  }
  .title {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.01em;
    color: var(--text);
    text-transform: lowercase;
    line-height: 1.3;
  }
  .title::before {
    content: ">";
    color: currentColor;
    margin-right: 8px;
    font-weight: 600;
  }
  .meta {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    margin: 0;
    letter-spacing: 0.01em;
  }
  /* `// ` prefix comes from the shared `.label-comment` utility class in app.css */
</style>
