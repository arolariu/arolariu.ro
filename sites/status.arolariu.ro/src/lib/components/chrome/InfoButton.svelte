<script lang="ts">
  /**
   * Tiny "i" trigger + anchored Popover used beside summary-card titles to
   * surface the formula/definition behind the metric. Click (or Enter/Space)
   * toggles open; the shared Popover primitive handles outside-click and
   * Escape dismissal. The trigger carries `aria-describedby` only while
   * open so AT consumers hear the tooltip text on demand, not on every focus.
   */
  import Popover from "./Popover.svelte";

  interface Props {
    /** The tooltip copy shown inside the popover. */
    text: string;
  }

  let {text}: Props = $props();
  /** Open/closed state of the anchored popover. */
  let open = $state(false);
  /** DOM ref for the trigger — passed to Popover so clicks on it don't count as "outside". */
  let buttonEl: HTMLButtonElement | undefined = $state(undefined);
  /** Unique id wired through `aria-describedby` → Popover's `surfaceId` for AT. */
  const id = `info-${Math.random().toString(36).slice(2, 10)}`;

  function toggle() {
    open = !open;
  }
</script>

<span class="info-wrap">
  <button
    bind:this={buttonEl}
    type="button"
    class="info-btn"
    aria-describedby={open ? id : undefined}
    aria-expanded={open}
    aria-label="Info: {text}"
    onclick={(e) => {
      e.stopPropagation();
      toggle();
    }}
  >
    <span aria-hidden="true">i</span>
  </button>
  <Popover
    {open}
    onClose={() => (open = false)}
    surfaceClass="info-popover"
    role="tooltip"
    surfaceId={id}
    anchorEl={buttonEl ?? null}
  >
    {text}
  </Popover>
</span>

<style>
  .info-wrap {
    position: relative;
    display: inline-block;
  }
  .info-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 0;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    vertical-align: middle;
    margin-left: 6px;
    line-height: 1;
  }
  .info-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .info-btn:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
  /*
   * Surface styling targets the Popover primitive via a :global() selector
   * because the element is rendered inside the primitive's template. The
   * shape (position/border/shadow) stays identical to the pre-refactor
   * bespoke `.popover` rule.
   */
  .info-wrap :global(.info-popover) {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    max-width: 260px;
    width: max-content;
    border: 1px solid var(--border-strong);
    border-left: 2px solid var(--accent);
    border-radius: 0;
    padding: 10px 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-style: normal;
    font-weight: 400;
    letter-spacing: 0.01em;
    text-transform: none;
    line-height: 1.5;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  }
  :global(:root[data-theme="light"]) .info-wrap :global(.info-popover) {
    box-shadow: 0 8px 24px rgba(21, 16, 10, 0.18), 0 0 0 1px rgba(21, 16, 10, 0.04);
  }
</style>
