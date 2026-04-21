<script lang="ts">
  /**
   * Root +layout
   * ------------
   * Minimal shell: pulls in the global stylesheet (`app.css` — design
   * tokens, resets, shared utilities) and renders the route's children.
   * No persistent chrome lives here — the page itself owns its masthead,
   * footer, and overlays.
   */
  import "@/app.css";

  /** Root layout props — only the Svelte-provided children snippet. */
  interface Props {
    /** Child route content injected by SvelteKit. */
    children?: import("svelte").Snippet;
  }
  let {children}: Props = $props();
</script>

{@render children?.()}
