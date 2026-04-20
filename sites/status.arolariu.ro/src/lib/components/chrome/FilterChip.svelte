<script lang="ts">
  /**
   * Shared filter-chip primitive. Used by FilterPills (time-window chips,
   * "bracket" variant — `[7d]` treatment) and IncidentList (service chips,
   * "underline" variant — active state drawn as a copper bottom border).
   *
   * Both variants share the same structure: a transparent, mono-font button
   * with `role="radio"` for roving-tabindex radio-group semantics. The
   * parent container is expected to carry `role="radiogroup"` and manage
   * the index/keyboard flow; this primitive only fires the callbacks.
   */

  interface Props {
    /** Visible text of the chip (also the only accessible name). */
    label: string;
    /** Whether this chip is the currently-selected option in its radiogroup. */
    active: boolean;
    /** Click handler — fires on mouse click as well as native Enter/Space activation. */
    onClick: () => void;
    /** Optional keydown hook so the parent radiogroup can implement arrow-key roving focus. */
    onKeydown?: (event: KeyboardEvent) => void;
    /** "bracket" → `[label]` treatment (FilterPills). "underline" → bottom-border accent (IncidentList). */
    variant?: "bracket" | "underline";
  }

  let {label, active, onClick, onKeydown, variant = "bracket"}: Props = $props();
</script>

<button
  type="button"
  role="radio"
  class="chip chip-{variant}"
  class:active
  aria-checked={active}
  tabindex={active ? 0 : -1}
  onclick={onClick}
  onkeydown={onKeydown}
>
  {label}
</button>

<style>
  /* Base chip: transparent, mono, roving-tabindex friendly. Variants layer on top. */
  .chip {
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    position: relative;
    transition: color .15s ease, border-color .15s ease;
  }
  .chip:hover { color: var(--text); }
  .chip:focus-visible {
    outline: 0;
    color: var(--text);
  }

  /* "bracket" variant — FilterPills time windows. */
  .chip-bracket {
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 400;
    flex-shrink: 0;
    scroll-snap-align: start;
  }
  .chip-bracket.active {
    color: var(--accent);
    font-weight: 500;
  }
  .chip-bracket.active::before {
    content: "[";
    color: var(--accent);
    margin-right: 4px;
  }
  .chip-bracket.active::after {
    content: "]";
    color: var(--accent);
    margin-left: 4px;
  }

  /* "underline" variant — IncidentList service chips. */
  .chip-underline {
    padding: 3px 8px;
    border-bottom: 1px solid transparent;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.4;
  }
  .chip-underline:focus-visible {
    border-bottom-color: var(--accent);
  }
  .chip-underline.active {
    color: var(--text);
    font-weight: 500;
    border-bottom-color: var(--accent);
  }
</style>
