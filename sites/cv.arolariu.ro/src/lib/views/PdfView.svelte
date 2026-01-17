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

<div class="min-h-screen transition-colors duration-300 bg-gradient-to-l from-blue-900 to-purple-900 via-pink-400">
  <Header
    sticky
    showNavLinks={false}
    variant="inverse" />

  <div class="flex justify-center items-center min-h-[calc(100vh-80px)] p-4 sm:p-8 print:p-0">
    {#if isMounted}
      {#if isMobile && !useEmbeddedViewer}
        <!-- Mobile-optimized view with native PDF options -->
        <div class="w-full max-w-md mx-auto">
          <div class="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
            <!-- Icon -->
            <div class="flex justify-center mb-6">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg
                  class="w-10 h-10 text-white"
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
            <h1 class="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white mb-2"> CV - PDF Format </h1>
            <p class="text-sm text-center text-gray-600 dark:text-gray-400 mb-6"> Alexandru-Razvan Olariu </p>

            <!-- Primary Action: Open in Native Viewer -->
            <button
              onclick={openInNativeViewer}
              class="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer mb-4 flex items-center justify-center gap-3">
              <svg
                class="w-6 h-6"
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
            <div class="grid grid-cols-2 gap-3 mb-6">
              <button
                onclick={downloadPdf}
                class="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2">
                <svg
                  class="w-5 h-5"
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
                class="py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2">
                <svg
                  class="w-5 h-5"
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
            <p class="text-xs text-center text-gray-500 dark:text-gray-500">
              For the best mobile experience, use your device's native PDF viewer
            </p>
          </div>
        </div>
      {:else}
        <!-- Desktop embedded viewer or mobile preview mode -->
        <div class="hidden lg:block w-1/8 h-full print:hidden"></div>

        <div class="w-full lg:w-3/4 flex flex-col items-center">
          {#if isMobile && useEmbeddedViewer}
            <!-- Mobile: Back to options button -->
            <button
              onclick={() => (useEmbeddedViewer = false)}
              class="mb-4 py-2 px-4 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer flex items-center gap-2 text-sm">
              <svg
                class="w-4 h-4"
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

          <div class="w-full flex justify-center">
            {#if isLoading}
              <div
                class="flex items-center justify-center w-full h-[65vh] rounded-lg bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-white/10"
                role="status"
                aria-busy="true"
                aria-live="polite">
                <div class="flex flex-col items-center gap-3 text-white">
                  <div
                    class="h-8 w-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"></div>
                  <span class="text-sm opacity-80">Loading PDF viewer...</span>
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
              <div
                class="flex flex-col items-center justify-center w-full h-[65vh] rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 p-8">
                <p class="text-white text-center mb-4"> PDF viewer could not be loaded. </p>
                <button
                  onclick={openInNativeViewer}
                  class="py-3 px-6 rounded-xl bg-white text-purple-700 font-semibold hover:bg-gray-100 transition-colors cursor-pointer">
                  Open PDF Directly
                </button>
              </div>
            {/if}
          </div>
        </div>

        <div class="hidden lg:block w-1/8 h-full print:hidden"></div>
      {/if}
    {:else}
      <!-- SSR placeholder -->
      <div
        class="flex items-center justify-center w-full max-w-3xl h-[65vh] rounded-lg bg-white/20 backdrop-blur-sm border border-white/30"
        role="status"
        aria-busy="true">
        <div class="flex flex-col items-center gap-3 text-white">
          <div class="h-8 w-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm opacity-80">Initializing...</span>
        </div>
      </div>
    {/if}
  </div>
</div>
