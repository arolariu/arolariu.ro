<script lang="ts">
  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let {open, onClose}: Props = $props();
  let dialogEl: HTMLDivElement | undefined = $state(undefined);
  let previousActive: Element | null = null;

  $effect(() => {
    if (open) {
      previousActive = document.activeElement;
      queueMicrotask(() => dialogEl?.focus());
    } else if (previousActive instanceof HTMLElement) {
      previousActive.focus();
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab" && dialogEl) {
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  const shortcuts = [
    {keys: "← →", action: "Previous / next filter window"},
    {keys: "1 – 9", action: "Jump directly to a window"},
    {keys: "R", action: "Refresh data"},
    {keys: "Esc", action: "Close expanded service or this overlay"},
    {keys: "?", action: "Toggle this help"},
  ];
</script>

{#if open}
  <div class="backdrop" onclick={onClose} role="presentation"></div>
  <div
    bind:this={dialogEl}
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="kb-help-title"
    tabindex="-1"
    onkeydown={handleKeydown}
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
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }
  .dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 24px;
    min-width: 320px;
    max-width: 90vw;
    z-index: 101;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }
  .dialog:focus-visible {
    outline: none;
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
