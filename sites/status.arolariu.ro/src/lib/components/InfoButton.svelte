<script lang="ts">
  interface Props {
    text: string;
  }

  let {text}: Props = $props();
  let open = $state(false);
  let buttonEl: HTMLButtonElement | undefined = $state(undefined);
  let popoverEl: HTMLSpanElement | undefined = $state(undefined);
  const id = `info-${Math.random().toString(36).slice(2, 10)}`;

  function toggle() {
    open = !open;
  }

  function handleDocClick(e: MouseEvent) {
    if (!(e.target instanceof Node)) return;
    // Close only when the click is outside BOTH the button and the popover.
    // Previously the popover's sibling position meant any in-popover click
    // (e.g. selecting the text) dismissed it instantly.
    const inButton = buttonEl?.contains(e.target) ?? false;
    const inPopover = popoverEl?.contains(e.target) ?? false;
    if (!inButton && !inPopover) open = false;
  }

  $effect(() => {
    if (!open) return;
    // Persistent listener while open — cannot use {once:true} because an
    // in-popover click must NOT close and must NOT consume the listener.
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  });
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
  {#if open}
    <span bind:this={popoverEl} {id} role="tooltip" class="popover">{text}</span>
  {/if}
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
    border-radius: 50%;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted, var(--text));
    font-size: 9px;
    font-style: italic;
    font-family: ui-serif, Georgia, serif;
    cursor: pointer;
    padding: 0;
    vertical-align: middle;
    margin-left: 6px;
    line-height: 1;
  }
  .info-btn:hover {
    background: var(--surface-hover, var(--surface-raised, rgba(255, 255, 255, 0.06)));
    color: var(--text);
  }
  .info-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    max-width: 240px;
    width: max-content;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: var(--fs-xs);
    font-style: normal;
    font-weight: 400;
    letter-spacing: normal;
    text-transform: none;
    line-height: 1.4;
    color: var(--text);
    opacity: 1;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 10;
  }
</style>
