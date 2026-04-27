<!--
@component PdfView

Displays the CV as a browser-native PDF with print and download capabilities.
On mobile devices, attempts native PDF rendering before showing fallback actions.

@remarks
**Rendering Context**: SvelteKit page component (SSR + CSR).

**Purpose**: Provides a traditional, printable CV format optimized for:
- ATS (Applicant Tracking Systems) compatibility
- Professional printing
- Email attachments

**Mobile Optimization**:
- Detects mobile/tablet devices via screen width and touch capability
- Tries the browser's native PDF renderer first
- Keeps open, download, and retry actions visible when the native surface stalls

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
  import {
    PDF_ASSET_URL,
    PDF_DOWNLOAD_FILENAME,
    PDF_NATIVE_ASSISTANCE_DELAY_MS,
    PDF_PRINT_ACTION_LABEL,
    PDF_PRINT_ASSISTANCE_TEXT,
    detectPdfDevice,
    getNextPdfSurfaceStatus,
    shouldShowPdfAssistance,
    type PdfSurfaceStatus,
  } from "@/lib/pdf/pdfViewerState";
  import styles from "./PdfView.module.scss";

  /** Track if component is mounted (client-side). */
  let isMounted = $state(false);

  /** Detect mobile device. */
  let isMobile = $state(false);

  /** Current status of the browser-native PDF surface. */
  let surfaceStatus = $state<PdfSurfaceStatus>("loading");

  /** Forces the native PDF element to remount when the user retries. */
  let nativeFrameKey = $state(0);

  /** Timer used to reveal fallback actions if native rendering stalls. */
  let assistanceTimer: ReturnType<typeof window.setTimeout> | undefined;

  const showAssistance = $derived(shouldShowPdfAssistance(surfaceStatus));
  const statusMessage = $derived(
    surfaceStatus === "loading"
      ? "Loading native PDF preview..."
      : surfaceStatus === "needs-assistance"
        ? "The browser PDF preview is still loading."
        : surfaceStatus === "failed"
          ? "The browser PDF preview could not be loaded."
          : "",
  );

  /**
   * Reads browser signals and updates route-level mobile affordances.
   */
  function syncDevicePreference(): void {
    const device = detectPdfDevice({
      innerWidth: window.innerWidth,
      maxTouchPoints: navigator.maxTouchPoints,
      userAgent: navigator.userAgent,
    });

    isMobile = device.isMobile;
  }

  /**
   * Opens the PDF in a new tab for native viewing.
   */
  function openInNativeViewer(): void {
    window.open(PDF_ASSET_URL, "_blank", "noopener,noreferrer");
  }

  /**
   * Downloads the PDF file.
   */
  function downloadPdf(): void {
    const link = document.createElement("a");
    link.href = PDF_ASSET_URL;
    link.download = PDF_DOWNLOAD_FILENAME;
    link.click();
  }

  /**
   * Opens the PDF in the browser-native viewer where the print command is reliable.
   */
  function openPdfForPrinting(): void {
    window.open(PDF_ASSET_URL, "_blank", "noopener,noreferrer");
  }

  /**
   * Clears any pending assistance timer.
   */
  function clearAssistanceTimer(): void {
    if (assistanceTimer !== undefined) {
      window.clearTimeout(assistanceTimer);
      assistanceTimer = undefined;
    }
  }

  /**
   * Starts a timer that reveals assistance actions if native rendering stalls.
   */
  function startAssistanceTimer(): void {
    clearAssistanceTimer();
    assistanceTimer = window.setTimeout(() => {
      surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "timeout");
    }, PDF_NATIVE_ASSISTANCE_DELAY_MS);
  }

  /**
   * Marks the browser-native PDF surface as ready.
   */
  function handleNativeLoad(): void {
    clearAssistanceTimer();
    surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "load");
  }

  /**
   * Marks the browser-native PDF surface as failed and shows fallback actions.
   */
  function handleNativeError(): void {
    clearAssistanceTimer();
    surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "error");
  }

  /**
   * Remounts the browser-native PDF surface after a failed or stalled load.
   */
  function retryNativeViewer(): void {
    surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "retry");
    nativeFrameKey += 1;
    startAssistanceTimer();
  }

  onMount(() => {
    isMounted = true;
    syncDevicePreference();
    startAssistanceTimer();

    const handleResize = () => {
      syncDevicePreference();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearAssistanceTimer();
      window.removeEventListener("resize", handleResize);
    };
  });
</script>

<div class={styles.shell}>
  <Header
    sticky
    showNavLinks={false}
    variant="inverse" />

  <div class={styles.viewerShell}>
    {#if isMounted}
      <div class={styles.sideSpacer}></div>

      <div class={styles.viewerColumn}>
        <div class={styles.viewerHeader}>
          <div>
            <h1 class={styles.viewerTitle}>CV - PDF Format</h1>
            <p class={styles.viewerSubtitle}>
              {isMobile
                ? "Trying your browser's native PDF viewer first."
                : "Rendered with your browser's native PDF capabilities."}
            </p>
          </div>

          <div class={styles.headerActions}>
            <button
              onclick={openInNativeViewer}
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </button>

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
              onclick={openPdfForPrinting}
              class={styles.secondaryButton}
              title={PDF_PRINT_ASSISTANCE_TEXT}>
              <svg
                class={styles.secondaryIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0h12v4H6v-4zm12-5h.01" />
              </svg>
              {PDF_PRINT_ACTION_LABEL}
            </button>
          </div>
        </div>

        <div class={styles.viewerFrame}>
          {#key nativeFrameKey}
            <object
              class={styles.nativeObject}
              data={PDF_ASSET_URL}
              type="application/pdf"
              title="Alexandru-Razvan Olariu CV PDF preview"
              aria-label="Alexandru-Razvan Olariu CV PDF preview"
              onload={handleNativeLoad}
              onerror={handleNativeError}>
              <div class={styles.fallbackPanel}>
                <p class={styles.fallbackText}>
                  Your browser did not expose an inline PDF viewer for this page.
                </p>
                <button
                  onclick={openInNativeViewer}
                  class={styles.fallbackButton}>
                  Open PDF Directly
                </button>
              </div>
            </object>
          {/key}

          {#if surfaceStatus === "loading"}
            <div
              class={styles.statusBadge}
              role="status"
              aria-busy="true"
              aria-live="polite">
              <div
                class={styles.spinner}
                aria-hidden="true"></div>
              <span>{statusMessage}</span>
            </div>
          {/if}
        </div>

        {#if showAssistance}
          <div
            class={styles.assistancePanel}
            role="status"
            aria-live="polite">
            <div>
              <h2 class={styles.assistanceTitle}>
                {surfaceStatus === "failed" ? "Native PDF preview unavailable" : "Still loading the PDF preview?"}
              </h2>
              <p class={styles.assistanceText}>
                {statusMessage} You can open the PDF in your browser viewer, download it, print it, or retry the inline
                preview. {PDF_PRINT_ASSISTANCE_TEXT}
              </p>
            </div>

            <div class={styles.assistanceActions}>
              <button
                onclick={openInNativeViewer}
                class={styles.primaryButton}>
                Open PDF
              </button>
              <button
                onclick={downloadPdf}
                class={styles.secondaryButton}>
                Download
              </button>
              <button
                onclick={openPdfForPrinting}
                class={styles.secondaryButton}
                title={PDF_PRINT_ASSISTANCE_TEXT}>
                {PDF_PRINT_ACTION_LABEL}
              </button>
              <button
                onclick={retryNativeViewer}
                class={styles.secondaryButton}>
                Retry Preview
              </button>
            </div>
          </div>
        {/if}
      </div>

      <div class={styles.sideSpacer}></div>
    {:else}
      <!-- SSR placeholder -->
      <div
        class={styles.ssrPanel}
        role="status"
        aria-busy="true">
        <div class={styles.loadingContent}>
          <div class={styles.spinner}></div>
          <span class={styles.loadingText}>Initializing native PDF viewer...</span>
        </div>
      </div>
    {/if}
  </div>
</div>
