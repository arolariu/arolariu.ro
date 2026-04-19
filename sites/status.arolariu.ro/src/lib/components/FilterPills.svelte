<script lang="ts">
  import {FILTER_WINDOWS, type FilterWindow} from "../types/status";

  interface Props {
    activeWindow: FilterWindow;
    onChange: (w: FilterWindow) => void;
  }

  let {activeWindow, onChange}: Props = $props();
</script>

<div class="pills" role="tablist" aria-label="Time window">
  {#each FILTER_WINDOWS as window (window)}
    <button
      type="button"
      role="tab"
      class="pill"
      class:active={window === activeWindow}
      aria-pressed={window === activeWindow}
      onclick={() => onChange(window)}
    >
      {window}
    </button>
  {/each}
</div>

<style>
  .pills {
    display: flex;
    gap: 4px;
    background: var(--surface);
    padding: 4px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .pill {
    padding: 5px 12px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
  }
  .pill.active {
    background: var(--surface-hover);
    color: var(--text);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
</style>
