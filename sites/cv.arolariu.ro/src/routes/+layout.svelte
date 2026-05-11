<script lang="ts">
  import "@/styles/global.scss";
  import {onNavigate} from "$app/navigation";
  import ScrollProgress from "@/components/ScrollProgress.svelte";
  import CommandPalette from "@/components/CommandPalette.svelte";
  import type {Snippet} from "svelte";

  interface Props {
    children?: Snippet;
  }

  const {children}: Props = $props();

  // Enable View Transitions API for smooth route changes.
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<a
  href="#main-content"
  class="sr-only sr-only-focusable">
  Skip to main content
</a>

<ScrollProgress />
<CommandPalette />

<main id="main-content">
  {@render children?.()}
</main>
