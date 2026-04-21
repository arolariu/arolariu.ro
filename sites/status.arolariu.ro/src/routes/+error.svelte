<script lang="ts">
  /**
   * Global +error boundary
   * ----------------------
   * SvelteKit renders this component whenever a route load or render
   * throws — shows the status code + message in a minimal layout. No
   * retry affordance; SvelteKit's built-in navigation reloads the app.
   */
  // `$app/state` (rune-based) is the Kit-2.12+ replacement for the
  // deprecated `$app/stores`. `page` is already reactive — no `$` prefix
  // needed at the template site.
  import {page} from "$app/state";
</script>

<main class="p-8">
  <h1 class="text-xl font-semibold">Error {page.status}</h1>
  <p class="mt-2 opacity-60">{page.error?.message ?? "Something went wrong."}</p>
</main>
