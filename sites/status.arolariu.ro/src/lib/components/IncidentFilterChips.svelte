<script lang="ts">
  import FilterChip from "./FilterChip.svelte";

  interface Props {
    /** Ordered list of chip values — `null` represents the "All" chip. */
    chips: readonly (string | null)[];
    /** Currently selected chip — `null` means "All". */
    selected: string | null;
    onSelect: (chip: string | null) => void;
  }

  let {chips, selected, onSelect}: Props = $props();

  function chipLabel(chip: string | null): string {
    return chip === null ? "All" : chip;
  }

  function handleKeydown(event: KeyboardEvent, index: number) {
    const total = chips.length;
    if (total <= 1) return;
    let newIndex = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        newIndex = (index + 1) % total;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        newIndex = (index - 1 + total) % total;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = total - 1;
        break;
      default:
        return; // Let Space/Enter bubble naturally
    }
    event.preventDefault();
    onSelect(chips[newIndex] ?? null);
    // Focus the newly-selected chip for keyboard users.
    const container = (event.currentTarget as HTMLElement).parentElement;
    const target = container?.children[newIndex] as HTMLElement | undefined;
    target?.focus();
  }
</script>

<div class="filter-chips" role="radiogroup" aria-label="Filter incidents by service">
  {#each chips as chip, i (chip ?? "__all__")}
    <FilterChip
      label={chipLabel(chip)}
      active={selected === chip}
      variant="underline"
      onClick={() => onSelect(chip)}
      onKeydown={(e) => handleKeydown(e, i)}
    />
  {/each}
</div>

<style>
  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
    margin-bottom: var(--sp-md);
    padding-bottom: var(--sp-sm);
    border-bottom: 1px solid var(--border);
  }
</style>
