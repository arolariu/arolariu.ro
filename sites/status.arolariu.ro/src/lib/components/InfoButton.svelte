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
  .popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    max-width: 260px;
    width: max-content;
    background: var(--bg);
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
    color: var(--text);
    opacity: 1;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
    z-index: 50;
  }
  :root[data-theme="light"] .popover {
    box-shadow: 0 8px 24px rgba(21, 16, 10, 0.18), 0 0 0 1px rgba(21, 16, 10, 0.04);
  }
</style>
