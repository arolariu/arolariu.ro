<script lang="ts">
  /**
   * Shared floating-surface primitive used by InfoButton (anchored popover)
   * and KeyboardHelpOverlay (centered modal dialog). Provides:
   *
   * - Opaque `var(--bg)` surface
   * - z-index: 50 (60 when modal, to stack above other popovers)
   * - Optional dimmed backdrop (for modal usage)
   * - Escape-to-close and outside-click-to-close behaviors
   *
   * Positioning is the caller's responsibility: the caller provides a
   * `surfaceClass` whose rules set `position` + coordinates. That lets
   * an anchored popover and a centered modal share this primitive without
   * forcing one positioning model onto both.
   *
   * SegmentTooltip does NOT use this primitive — its viewport-flip edge
   * cases don't fit a generic contract and it keeps bespoke rendering.
   */
  import type {Snippet} from "svelte";

  interface Props {
    open: boolean;
    onClose: () => void;
    /** Caller-supplied class applied to the surface — carries positioning, radius, border. */
    surfaceClass: string;
    /** Render a dimmed backdrop behind the surface and treat as modal (role=dialog, focus-trap). */
    modal?: boolean;
    /** Close when Escape is pressed inside the surface. Default: true. */
    closeOnEscape?: boolean;
    /** Close when a click lands outside the surface (and outside any provided anchor). Default: true. */
    closeOnOutsideClick?: boolean;
    /** Element inside which clicks should NOT count as "outside" (e.g. the trigger button). */
    anchorEl?: HTMLElement | null;
    /** ARIA role for the surface ("dialog" | "tooltip" | ...). */
    role?: string;
    /** Optional id for the surface (consumers forward to `aria-describedby`). */
    surfaceId?: string;
    /** Optional `aria-labelledby` / `aria-modal` / etc. */
    ariaLabelledBy?: string;
    ariaModal?: boolean;
    /** Rendered content of the surface. */
    children: Snippet;
  }

  let {
    open,
    onClose,
    surfaceClass,
    modal = false,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    anchorEl = null,
    role = modal ? "dialog" : "tooltip",
    surfaceId,
    ariaLabelledBy,
    ariaModal,
    children,
  }: Props = $props();

  let surfaceEl: HTMLDivElement | undefined = $state(undefined);
  let previousActive: Element | null = null;

  function handleDocClick(event: MouseEvent) {
    if (!(event.target instanceof Node)) return;
    const inSurface = surfaceEl?.contains(event.target) ?? false;
    const inAnchor = anchorEl?.contains(event.target) ?? false;
    if (!inSurface && !inAnchor) onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (modal && event.key === "Tab" && surfaceEl) {
      const focusables = surfaceEl.querySelectorAll<HTMLElement>(
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

  $effect(() => {
    if (!open) return;
    if (closeOnOutsideClick) {
      document.addEventListener("click", handleDocClick);
    }
    if (modal) {
      previousActive = document.activeElement;
      queueMicrotask(() => surfaceEl?.focus());
    }
    return () => {
      if (closeOnOutsideClick) document.removeEventListener("click", handleDocClick);
      if (modal && previousActive instanceof HTMLElement) previousActive.focus();
    };
  });
</script>

{#if open}
  {#if modal}
    <div class="backdrop" onclick={onClose} role="presentation"></div>
  {/if}
  <div
    bind:this={surfaceEl}
    id={surfaceId}
    class={`popover-surface ${modal ? "popover-modal" : ""} ${surfaceClass}`}
    {role}
    aria-modal={ariaModal}
    aria-labelledby={ariaLabelledBy}
    tabindex={modal ? -1 : undefined}
    onkeydown={handleKeydown}
  >
    {@render children()}
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }
  /*
   * Base surface styles. Caller's surfaceClass rules layer on top of these
   * and override position/border/radius/shadow as needed.
   */
  .popover-surface {
    background: var(--bg);
    color: var(--text);
    z-index: 50;
  }
  .popover-surface.popover-modal {
    z-index: 101;
  }
  .popover-surface:focus-visible {
    outline: none;
  }
</style>
