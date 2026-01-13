<script lang="ts">
  import "@/app.css";
  import {onNavigate, preloadData} from "$app/navigation";
  import {page} from "$app/stores";
  import ScrollProgress from "@/components/ScrollProgress.svelte";
  import CommandPalette from "@/components/CommandPalette.svelte";
  import {onMount} from "svelte";

  // Enable View Transitions API for smooth route changes
  onNavigate((navigation) => {
    // Skip if View Transitions API is not supported
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // Prefetch routes on mount for instant navigation
  onMount(() => {
    // Prefetch main routes after initial render
    const prefetchRoutes = ["/human", "/pdf", "/json"];

    // Use requestIdleCallback for non-blocking prefetch
    const prefetch = () => {
      prefetchRoutes.forEach((route) => {
        // Don't prefetch current route
        if ($page.url.pathname !== route) {
          preloadData(route).catch(() => {
            // Silently ignore prefetch errors
          });
        }
      });
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

<main
  id="main-content"
  class="dark:text-white">
  <slot />
</main>
