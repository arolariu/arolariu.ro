<script lang="ts">
  import type {HealthStatus} from "../types/status";

  interface Props {
    overallStatus: HealthStatus | "loading";
    lastProbeAt?: string;
    affectedServices?: readonly string[];
  }

  let {overallStatus, lastProbeAt, affectedServices = []}: Props = $props();

  const title = $derived(
    overallStatus === "Healthy" ? "All systems operational"
    : overallStatus === "Degraded" ? "Some systems degraded"
    : overallStatus === "Unhealthy" ? "Major service outage"
    : "Loading status…"
  );

  function formatAgo(iso: string | undefined): string {
    if (!iso) return "";
    const ms = Date.now() - Date.parse(iso);
    if (!Number.isFinite(ms) || ms < 0) return "";
    const min = Math.floor(ms / 60_000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} h ago`;
    return `${Math.floor(hr / 24)} d ago`;
  }
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
    {#if overallStatus !== "Healthy" && affectedServices.length > 0}
      <div class="meta">Affected: {affectedServices.join(", ")}</div>
    {:else if lastProbeAt}
      <div class="meta">Last probe · {formatAgo(lastProbeAt)}</div>
    {/if}
  </div>
</div>

<style>
  .banner {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--sp-sm);
    align-items: center;
    padding: var(--sp-sm) var(--sp-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-md);
    background: var(--status-up-bg);
    border: 1px solid var(--status-up-border);
    color: var(--status-up);
  }
  .banner-degraded { background: var(--status-deg-bg); border-color: var(--status-deg-border); color: var(--status-deg); }
  .banner-unhealthy { background: var(--status-down-bg); border-color: var(--status-down-border); color: var(--status-down); }
  .banner-loading { background: var(--surface); border-color: var(--border); color: var(--text-muted); }

  .icon { display: inline-flex; align-items: center; justify-content: center; }
  .icon .spinner { animation: spin 1.2s linear infinite; transform-origin: 10px 10px; }
  .body { min-width: 0; color: var(--text); }
  .title { font-weight: 600; font-size: var(--fs-body); }
  .meta { font-size: var(--fs-xs); opacity: 0.6; margin-top: 2px; }
</style>
