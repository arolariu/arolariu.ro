<script lang="ts">
  /**
   * Modal "keyboard shortcuts" cheat-sheet shown when the user presses `?`.
   * Rendered through the shared Popover primitive in modal mode, which
   * handles backdrop click, Escape-to-close, focus trap, and focus
   * restoration to the trigger on close. This component only owns layout
   * and the shortcut list — all dismissal semantics live in Popover.
   */
  import Popover from "./Popover.svelte";

  interface Props {
    /** When true the dialog is rendered; when false nothing mounts. */
    open: boolean;
    /** Invoked by Popover on Escape, outside click, or the Close button. */
    onClose: () => void;
  }

  let {open, onClose}: Props = $props();

  /** Static shortcut rows — keys column + description column. */
  const shortcuts = [
    {keys: "← →", action: "Previous / next filter window"},
    {keys: "1 – 9", action: "Jump directly to a window"},
    {keys: "R", action: "Refresh data"},
    {keys: "Esc", action: "Close expanded service or this overlay"},
    {keys: "?", action: "Toggle this help"},
  ];
</script>

<Popover
  {open}
  {onClose}
  surfaceClass="kb-help-dialog"
  modal
  ariaModal
  ariaLabelledBy="kb-help-title"
  role="dialog"
>
  <h2 id="kb-help-title">Keyboard shortcuts</h2>
  <dl>
    {#each shortcuts as s (s.keys)}
      <div class="row">
        <dt><kbd>{s.keys}</kbd></dt>
        <dd>{s.action}</dd>
      </div>
    {/each}
  </dl>
  <button type="button" class="close" onclick={onClose} aria-label="Close help">Close</button>
</Popover>

<style>
  /*
   * Surface styling targets the Popover primitive via :global() since the
   * element is rendered inside the primitive's template. Dimensions and
   * positioning match the pre-refactor `.dialog` rule exactly.
   */
  :global(.kb-help-dialog) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 24px;
    min-width: 320px;
    max-width: 90vw;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  :global(:root[data-theme="light"] .kb-help-dialog) {
    background: #ffffff;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.06);
  }
  h2 {
    margin: 0 0 16px;
    font-size: var(--fs-lg);
  }
  dl {
    margin: 0 0 12px;
    display: grid;
    gap: 8px;
  }
  .row {
    display: grid;
    grid-template-columns: 80px 1fr;
    align-items: center;
    gap: 12px;
  }
  dt {
    margin: 0;
  }
  dd {
    margin: 0;
    font-size: var(--fs-sm);
  }
  kbd {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 12px;
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--surface-raised, var(--surface-hover));
    color: var(--text);
  }
  .close {
    background: var(--accent, #0969da);
    color: white;
    border: 0;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  .close:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
</style>
