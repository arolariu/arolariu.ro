<!--
@component ErrorBoundary

Global error page displayed when route loading fails or an unhandled error occurs.

@remarks
**Rendering Context**: SvelteKit error boundary (SSR + CSR).

**Purpose**: Provides a user-friendly error experience with:
- Clear error messaging appropriate to the error type
- Navigation back to safety (home page)
- Theme-aware styling
- Proper accessibility attributes

**Error Types Handled**:
- 404: Page not found
- 500: Server errors
- Network failures
- Unhandled exceptions

@example
This component is automatically rendered by SvelteKit when an error occurs.
-->
<script lang="ts">
  import {page} from "$app/stores";
  import {goto} from "$app/navigation";
  import ThemeToggle from "@/components/ThemeToggle.svelte";

  const error = $derived($page.error);
  const status = $derived($page.status);

  const errorMessages: Record<number, {title: string; description: string}> = {
    404: {
      title: "Page Not Found",
      description: "The page you're looking for doesn't exist or has been moved.",
    },
    500: {
      title: "Server Error",
      description: "Something went wrong on our end. Please try again later.",
    },
    503: {
      title: "Service Unavailable",
      description: "The service is temporarily unavailable. Please try again in a moment.",
    },
  };

  const currentError = $derived(
    errorMessages[status] ?? {
      title: "Something Went Wrong",
      description: error?.message ?? "An unexpected error occurred.",
    },
  );

  function goHome() {
    goto("/");
  }

  function retry() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Error {status} | cv.arolariu.ro</title>
  <meta
    name="robots"
    content="noindex, nofollow" />
</svelte:head>

<div
  class="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 flex items-center justify-center p-6"
  role="main"
  aria-labelledby="error-title">
  <!-- Theme Toggle -->
  <div class="fixed top-6 right-6 z-50">
    <ThemeToggle />
  </div>

  <div class="text-center max-w-md mx-auto">
    <!-- Error Code -->
    <div
      class="text-8xl font-bold text-blue-600 dark:text-blue-400 mb-4 font-['Caudex']"
      aria-hidden="true">
      {status}
    </div>

    <!-- Error Title -->
    <h1
      id="error-title"
      class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
      {currentError.title}
    </h1>

    <!-- Error Description -->
    <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
      {currentError.description}
    </p>

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        type="button"
        onclick={goHome}
        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/40">
        Go Home
      </button>

      {#if status >= 500}
        <button
          type="button"
          onclick={retry}
          class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-4 focus:ring-gray-500/40">
          Try Again
        </button>
      {/if}
    </div>

    <!-- Debug Info (Development Only) -->
    {#if error?.message && status >= 500}
      <details class="mt-8 text-left">
        <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Technical Details
        </summary>
        <pre
          class="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-auto max-h-40 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
          >{error.message}</pre>
      </details>
    {/if}
  </div>
</div>
