<script lang="ts">
  import type {Bucket} from "../types/status";

  interface Props {
    bucket: Bucket | null;
    anchor: HTMLElement | null;
  }

  let {bucket, anchor}: Props = $props();

  let position = $state({top: 0, left: 0});

  $effect(() => {
    if (!anchor || !bucket) return;
    const rect = anchor.getBoundingClientRect();
    position = {
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2 + window.scrollX,
    };
  });

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16).replace("T", " · ") + " UTC";
  }
</script>

{#if bucket}
  <div
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
  </div>
{/if}

<style>
  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 12px 14px;
    min-width: 260px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    font-size: 12px;
    z-index: 10;
    pointer-events: none;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }
  .time { font-weight: 500; }
  .badge {
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge-healthy { background: var(--status-up-bg); color: var(--status-up); border: 1px solid var(--status-up-border); }
  .badge-degraded { background: var(--status-deg-bg); color: var(--status-deg); border: 1px solid var(--status-deg-border); }
  .badge-unhealthy { background: var(--status-down-bg); color: var(--status-down); }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .k { opacity: 0.55; }
  .reason {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--border);
    color: var(--status-deg);
  }
</style>
