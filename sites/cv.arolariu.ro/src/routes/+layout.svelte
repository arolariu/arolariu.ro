<script lang="ts">
  import "@/styles/global.scss";
  import {onNavigate, preloadData} from "$app/navigation";
  import {page} from "$app/stores";
  import ScrollProgress from "@/components/ScrollProgress.svelte";
  import CommandPalette from "@/components/CommandPalette.svelte";
  import {onMount} from "svelte";
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

  // Prefetch the three top-level routes on first idle.
  onMount(() => {
    const prefetchRoutes = ["/human", "/pdf", "/json"];

    const prefetch = (): void => {
      for (const route of prefetchRoutes) {
        if ($page.url.pathname !== route) {
          preloadData(route).catch(() => {
            // Silently ignore prefetch errors
          });
        }
      }
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(prefetch, {timeout: 2000});
    } else {
      setTimeout(prefetch, 100);
    }
  });
</script>

<ScrollProgress />
<CommandPalette />

<main id="main-content">
  {@render children?.()}
</main>
