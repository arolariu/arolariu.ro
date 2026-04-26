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
  import styles from "./ErrorPage.module.scss";

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

  function goHome(): void {
    goto("/");
  }

  function retry(): void {
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
  class={styles.shell}
  role="main"
  aria-labelledby="error-title">
  <!-- Theme Toggle -->
  <div class={styles.themeToggle}>
    <ThemeToggle />
  </div>

  <div class={styles.content}>
    <!-- Error Code -->
    <div
      class={styles.errorCode}
      aria-hidden="true">
      {status}
    </div>

    <!-- Error Title -->
    <h1
      id="error-title"
      class={styles.errorTitle}>
      {currentError.title}
    </h1>

    <!-- Error Description -->
    <p class={styles.errorDescription}>
      {currentError.description}
    </p>

    <!-- Action Buttons -->
    <div class={styles.actions}>
      <button
        type="button"
        onclick={goHome}
        class={styles.primaryButton}>
        Go Home
      </button>

      {#if status >= 500}
        <button
          type="button"
          onclick={retry}
          class={styles.secondaryButton}>
          Try Again
        </button>
      {/if}
    </div>

    <!-- Debug Info (Development Only) -->
    {#if error?.message && status >= 500}
      <details class={styles.debugSection}>
        <summary class={styles.debugSummary}>
          Technical Details
        </summary>
        <pre class={styles.debugContent}>{error.message}</pre>
      </details>
    {/if}
  </div>
</div>
