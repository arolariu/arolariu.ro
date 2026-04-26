<!--
@component PdfView

Displays the CV as an embedded PDF with print and download capabilities.
On mobile devices, provides options for native PDF viewing.

@remarks
**Rendering Context**: SvelteKit page component (SSR + CSR).

**Purpose**: Provides a traditional, printable CV format optimized for:
- ATS (Applicant Tracking Systems) compatibility
- Professional printing
- Email attachments

**Mobile Optimization**:
- Detects mobile/tablet devices via screen width and touch capability
- Offers prominent "Open in PDF Viewer" button for native experience
- Falls back to embedded viewer with mobile-friendly controls

**PDF Viewer**: Uses `svelte-pdf` library on desktop, dynamically imported
on mount to avoid SSR issues (PDF.js requires browser APIs).

**Accessibility**:
- Loading state uses `role="status"`, `aria-busy`, `aria-live="polite"`
- Touch-friendly buttons for mobile users
- Keyboard accessible controls

@example
```svelte
<PdfView />
```
-->
<script lang="ts">
  import Header from "@/presentation/Header.svelte";
  import {onMount} from "svelte";
  import styles from "./PdfView.module.scss";

  /** PDF file URL */
  const PDF_URL = "./cv.pdf";
  const PDF_FILENAME = "CV_AlexandruRazvan_Olariu.pdf";

  /** Dynamically imported PDF viewer component. */
  let PdfViewer = $state<any>(null);

  /** Track if component is mounted (client-side). */
  let isMounted = $state(false);

  /** Detect mobile device. */
  let isMobile = $state(false);

  /** User preference: whether to use embedded viewer even on mobile. */
  let useEmbeddedViewer = $state(false);

  /** Loading state for PDF viewer. */
  let isLoading = $state(true);

  /**
   * Detects if the current device is mobile/tablet.
   * Uses a combination of screen width and touch capability.
   */
  function detectMobile(): boolean {
    if (typeof window === "undefined") return false;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return (hasTouch && isSmallScreen) || isMobileUA;
  }

  /**
   * Opens the PDF in a new tab for native viewing.
   */
  function openInNativeViewer(): void {
    window.open(PDF_URL, "_blank", "noopener,noreferrer");
  }

  /**
   * Downloads the PDF file.
   */
  function downloadPdf(): void {
    const link = document.createElement("a");
    link.href = PDF_URL;
    link.download = PDF_FILENAME;
    link.click();
  }

  /**
   * Switch to embedded viewer on mobile.
   */
  function showEmbeddedViewer(): void {
    useEmbeddedViewer = true;
    loadPdfViewer();
  }

  /**
   * Loads the PDF viewer dynamically.
   */
  async function loadPdfViewer(): Promise<void> {
    try {
      const module = await import("svelte-pdf");
      PdfViewer = module.default;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    isMounted = true;
    isMobile = detectMobile();

    // Auto-load PDF viewer on desktop
    if (!isMobile) {
      loadPdfViewer();
    } else {
      isLoading = false;
    }

    // Handle resize events
    const handleResize = () => {
      isMobile = detectMobile();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });
</script>

<div class={styles.shell}>
  <Header
    sticky
    showNavLinks={false}
    variant="inverse" />

  <div class={styles.viewerShell}>
    {#if isMounted}
      {#if isMobile && !useEmbeddedViewer}
        <!-- Mobile-optimized view with native PDF options -->
        <div class={styles.mobileCardWrap}>
          <div class={styles.mobileCard}>
            <!-- Icon -->
            <div class={styles.mobileIconWrap}>
              <div class={styles.mobileIconFrame}>
                <svg
                  class={styles.mobileIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <!-- Title -->
            <h1 class={styles.mobileTitle}> CV - PDF Format </h1>
            <p class={styles.mobileSubtitle}> Alexandru-Razvan Olariu </p>

            <!-- Primary Action: Open in Native Viewer -->
            <button
              onclick={openInNativeViewer}
              class={styles.primaryButton}>
              <svg
                class={styles.primaryIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in PDF Viewer
            </button>

            <!-- Secondary Actions -->
            <div class={styles.secondaryActions}>
              <button
                onclick={downloadPdf}
                class={styles.secondaryButton}>
                <svg
                  class={styles.secondaryIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
              <button
                onclick={showEmbeddedViewer}
                class={styles.secondaryButton}>
                <svg
                  class={styles.secondaryIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
            </div>

            <!-- Info text -->
            <p class={styles.infoText}>
              For the best mobile experience, use your device's native PDF viewer
            </p>
          </div>
        </div>
      {:else}
        <!-- Desktop embedded viewer or mobile preview mode -->
        <div class={styles.sideSpacer}></div>

        <div class={styles.viewerColumn}>
          {#if isMobile && useEmbeddedViewer}
            <!-- Mobile: Back to options button -->
            <button
              onclick={() => (useEmbeddedViewer = false)}
              class={styles.backButton}>
              <svg
                class={styles.backIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to options
            </button>
          {/if}

          <div class={styles.viewerFrame}>
            {#if isLoading}
              <div
                class={styles.loadingPanel}
                role="status"
                aria-busy="true"
                aria-live="polite">
                <div class={styles.loadingContent}>
                  <div
                    class={styles.spinner}
                    aria-hidden="true"></div>
                  <span class={styles.loadingText}>Loading PDF viewer...</span>
                </div>
              </div>
            {:else if PdfViewer}
              <PdfViewer
                url={PDF_URL}
                downloadFileName={PDF_FILENAME}
                showButtons={["print", "download", "timeInfo", "pageInfo", "zoom"]}
                showTopButton={false} />
            {:else}
              <!-- Fallback if PDF viewer failed to load -->
              <div class={styles.fallbackPanel}>
                <p class={styles.fallbackText}> PDF viewer could not be loaded. </p>
                <button
                  onclick={openInNativeViewer}
                  class={styles.fallbackButton}>
                  Open PDF Directly
                </button>
              </div>
            {/if}
          </div>
        </div>

        <div class={styles.sideSpacer}></div>
      {/if}
    {:else}
      <!-- SSR placeholder -->
      <div
        class={styles.ssrPanel}
        role="status"
        aria-busy="true">
        <div class={styles.loadingContent}>
          <div class={styles.spinner}></div>
          <span class={styles.loadingText}>Initializing...</span>
        </div>
      </div>
    {/if}
  </div>
</div>
