<script lang="ts">
  import {FILTER_WINDOWS, type FilterWindow} from "../../types/status";
  import FilterChip from "./FilterChip.svelte";

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
    onChange(FILTER_WINDOWS[newIndex]!);
    // Focus the newly-selected pill for keyboard users
    const container = (event.currentTarget as HTMLElement).parentElement;
    const target = container?.children[newIndex] as HTMLElement | undefined;
    target?.focus();
  }
</script>

<div class="pills" role="radiogroup" aria-label="Time window">
  {#each FILTER_WINDOWS as window, i (window)}
    <FilterChip
      label={window}
      active={window === activeWindow}
      variant="bracket"
      onClick={() => onChange(window)}
      onKeydown={(e) => handleKeydown(e, i)}
    />
  {/each}
</div>

<style>
  .pills {
    display: flex;
    gap: 2px;
    background: transparent;
    padding: 0;
    border-radius: 0;
    border: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .pills::-webkit-scrollbar { display: none; }
</style>
