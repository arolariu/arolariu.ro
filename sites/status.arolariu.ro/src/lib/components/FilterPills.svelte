<script lang="ts">
  import {FILTER_WINDOWS, type FilterWindow} from "../types/status";

  interface Props {
    activeWindow: FilterWindow;
    onChange: (w: FilterWindow) => void;
  }

  let {activeWindow, onChange}: Props = $props();

  function handleKeydown(event: KeyboardEvent, index: number) {
    let newIndex = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        newIndex = (index + 1) % FILTER_WINDOWS.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        newIndex = (index - 1 + FILTER_WINDOWS.length) % FILTER_WINDOWS.length;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = FILTER_WINDOWS.length - 1;
        break;
      default:
        return; // Let Space/Enter bubble naturally
    }
    event.preventDefault();
    onChange(FILTER_WINDOWS[newIndex]);
    // Focus the newly-selected pill for keyboard users
    const container = (event.currentTarget as HTMLElement).parentElement;
    const target = container?.children[newIndex] as HTMLElement | undefined;
    target?.focus();
  }
</script>

<div class="pills" role="radiogroup" aria-label="Time window">
  {#each FILTER_WINDOWS as window, i (window)}
    <button
      type="button"
      role="radio"
      class="pill"
      class:active={window === activeWindow}
      aria-checked={window === activeWindow}
      tabindex={window === activeWindow ? 0 : -1}
      onclick={() => onChange(window)}
      onkeydown={(e) => handleKeydown(e, i)}
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
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .pills::-webkit-scrollbar { display: none; }
  .pill {
    padding: 5px 12px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    cursor: pointer;
    flex-shrink: 0;
    scroll-snap-align: start;
    font-variant-numeric: tabular-nums;
    transition: color .12s, background .12s;
  }
  .pill:hover { color: var(--text); }
  .pill:focus-visible {
    outline: 2px solid var(--status-up);
    outline-offset: 1px;
  }
  .pill.active {
    background: var(--surface-hover);
    color: var(--text);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
</style>
