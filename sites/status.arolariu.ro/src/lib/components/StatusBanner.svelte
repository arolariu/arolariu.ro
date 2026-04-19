<script lang="ts">
  import type {HealthStatus} from "../types/status";
  import RefreshButton from "./RefreshButton.svelte";

  interface Props {
    overallStatus: HealthStatus | "loading";
    lastProbeAt?: string;
    refreshing: boolean;
    onRefresh: () => void;
  }

  let {overallStatus, lastProbeAt, refreshing, onRefresh}: Props = $props();

  const title = $derived(
    overallStatus === "Healthy" ? "All systems operational"
    : overallStatus === "Degraded" ? "Some systems degraded"
    : overallStatus === "Unhealthy" ? "Major outage"
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
    return `${hr} h ago`;
  }
</script>

<div class="banner banner-{overallStatus.toLowerCase()}" role="status" aria-live="polite">
  <div class="icon">
    {#if overallStatus === "Healthy"}✓{:else if overallStatus === "Degraded"}⚠{:else if overallStatus === "Unhealthy"}✗{:else}…{/if}
  </div>
  <div class="body">
    <div class="title">{title}</div>
    {#if lastProbeAt}<div class="meta">Last probe · {formatAgo(lastProbeAt)}</div>{/if}
  </div>
  <RefreshButton {refreshing} onClick={onRefresh}/>
</div>

<style>
  .banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: 10px;
    background: var(--status-up-bg);
    border: 1px solid var(--status-up-border);
    margin-bottom: 20px;
  }
  .banner-degraded {
    background: var(--status-deg-bg);
    border-color: var(--status-deg-border);
  }
  .banner-unhealthy {
    background: var(--status-down-bg);
    border-color: var(--status-down);
  }
  .banner-loading {
    background: var(--surface);
    border-color: var(--border);
  }
  .icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    color: var(--status-up);
  }
  .banner-degraded .icon { color: var(--status-deg); }
  .banner-unhealthy .icon { color: var(--status-down); }
  .body { flex: 1; }
  .title { font-weight: 600; font-size: 14px; }
  .meta { font-size: 11px; opacity: 0.6; margin-top: 2px; }
</style>
