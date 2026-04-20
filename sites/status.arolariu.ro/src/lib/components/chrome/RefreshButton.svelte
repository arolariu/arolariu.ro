<script lang="ts">
  interface Props {
    refreshing: boolean;
    onClick: () => void;
  }
  let {refreshing, onClick}: Props = $props();
</script>

<button
  type="button"
  class="refresh"
  class:spinning={refreshing}
  aria-label="Refresh status data"
  aria-busy={refreshing}
  disabled={refreshing}
  onclick={onClick}
>
  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M8 3a5 5 0 0 0-4.546 2.914L2.01 5.5a.5.5 0 1 0-.96.276l1 3.5a.5.5 0 0 0 .618.335l3.5-1a.5.5 0 0 0-.276-.96l-1.965.56A4.001 4.001 0 0 1 12 8a.5.5 0 0 0 1 0 5 5 0 0 0-5-5zm4.937 2.724a.5.5 0 0 0-.618-.335l-3.5 1a.5.5 0 1 0 .276.96l1.965-.56A4.001 4.001 0 0 1 4 8a.5.5 0 0 0-1 0 5 5 0 0 0 9.546 2.086l1.444.414a.5.5 0 1 0 .96-.276l-1-3.5z"/>
  </svg>
</button>

<style>
  .refresh {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    padding: 6px;
    cursor: pointer;
    transition: color .12s;
  }
  .refresh:hover:not(:disabled) { color: var(--text); }
  .refresh.spinning svg { animation: spin 1s linear infinite; }
  .refresh:disabled { cursor: default; opacity: 0.7; }
</style>
