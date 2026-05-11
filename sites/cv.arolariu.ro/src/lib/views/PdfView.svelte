<!--
@component PdfView

Displays the CV as a browser-native PDF inside an editorial frame with a
metadata sidebar (file size, page count, format, last-updated, ATS status).

@remarks
- Preserves the full PDF surface state machine (loading, needs-assistance,
  failed, retry).
- Uses semantic accent tokens; no gradient shell, no glassmorphism.
- Sidebar collapses below the PDF on mobile via CSS Grid.

@see {@link pdfViewerState} for the state machine and exposed metadata constants.
-->
<script lang="ts">
  import {onMount} from "svelte";
  import {
    PDF_ASSET_URL,
    PDF_ATS_STATUS,
    PDF_DOWNLOAD_FILENAME,
    PDF_FILE_SIZE_DISPLAY,
    PDF_FORMAT_DISPLAY,
    PDF_LAST_UPDATED,
    PDF_NATIVE_ASSISTANCE_DELAY_MS,
    PDF_PAGE_COUNT,
    PDF_PRINT_ACTION_LABEL,
    PDF_PRINT_ASSISTANCE_TEXT,
    detectPdfDevice,
    getNextPdfSurfaceStatus,
    shouldShowPdfAssistance,
    type PdfSurfaceStatus,
  } from "@/lib/pdf/pdfViewerState";
  import {cx} from "@/lib/utils/classNames";
  import Header from "@/presentation/Header.svelte";
  import styles from "./PdfView.module.scss";

  let isMounted = $state(false);
  let isMobile = $state(false);
  let surfaceStatus = $state<PdfSurfaceStatus>("loading");
  let nativeFrameKey = $state(0);
  let assistanceTimer: number | undefined;

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

  function syncDevicePreference(): void {
    const device = detectPdfDevice({
      innerWidth: window.innerWidth,
      maxTouchPoints: navigator.maxTouchPoints,
      userAgent: navigator.userAgent,
    });
    isMobile = device.isMobile;
  }

  function openInNativeViewer(): void {
    window.open(PDF_ASSET_URL, "_blank", "noopener,noreferrer");
  }

  function downloadPdf(): void {
    const link = document.createElement("a");
    link.href = PDF_ASSET_URL;
    link.download = PDF_DOWNLOAD_FILENAME;
    link.click();
  }

  function openPdfForPrinting(): void {
    window.open(PDF_ASSET_URL, "_blank", "noopener,noreferrer");
  }

  function clearAssistanceTimer(): void {
    if (assistanceTimer !== undefined) {
      window.clearTimeout(assistanceTimer);
      assistanceTimer = undefined;
    }
  }

  function startAssistanceTimer(): void {
    clearAssistanceTimer();
    assistanceTimer = window.setTimeout(() => {
      surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "timeout");
    }, PDF_NATIVE_ASSISTANCE_DELAY_MS);
  }

  function handleNativeLoad(): void {
    clearAssistanceTimer();
    surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "load");
  }

  function handleNativeError(): void {
    clearAssistanceTimer();
    surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "error");
  }

  function retryNativeViewer(): void {
    surfaceStatus = getNextPdfSurfaceStatus(surfaceStatus, "retry");
    nativeFrameKey += 1;
    startAssistanceTimer();
  }

  onMount(() => {
    isMounted = true;
    syncDevicePreference();
    startAssistanceTimer();

    const handleResize = () => syncDevicePreference();
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
    showNavLinks={false} />

  <section class={styles.container}>
    <section class={styles.hero}>
      <span class={styles.heroPill}>PDF &middot; A4 &middot; ONE PAGE</span>
      <h1 class={styles.heroTitle}>Printable <span class={styles.heroTitleAccent}>CV</span></h1>
      <p class={styles.heroSubtitle}>
        {isMobile ? "Trying your browser's native PDF viewer first." : "A traditional resume optimized for printing and ATS pipelines."}
      </p>
    </section>

    {#if isMounted}
      <div class={styles.mainGrid}>
        <div class={styles.viewerColumn}>
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
                  <p class={styles.fallbackText}>Your browser did not expose an inline PDF viewer for this page.</p>
                  <button
                    onclick={openInNativeViewer}
                    class={cx(styles.actionButton, styles.actionButtonPrimary)}>
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
        </div>

        <aside class={styles.sidebar}>
          <h2 class={styles.sidebarTitle}>The artifact</h2>
          <p class={styles.sidebarBlurb}>A traditional one-page CV. Optimized for printing and ATS pipelines.</p>

          <dl class={styles.sidebarMeta}>
            <div class={styles.sidebarMetaRow}>
              <dt>Size</dt>
              <dd>{PDF_FILE_SIZE_DISPLAY}</dd>
            </div>
            <div class={styles.sidebarMetaRow}>
              <dt>Pages</dt>
              <dd>{PDF_PAGE_COUNT}</dd>
            </div>
            <div class={styles.sidebarMetaRow}>
              <dt>Updated</dt>
              <dd>{PDF_LAST_UPDATED}</dd>
            </div>
            <div class={styles.sidebarMetaRow}>
              <dt>Format</dt>
              <dd>{PDF_FORMAT_DISPLAY}</dd>
            </div>
            <div
              class={cx(styles.sidebarMetaRow, styles.sidebarMetaRowSuccess)}
              data-pdf-ats>
              <dt>ATS</dt>
              <dd>{PDF_ATS_STATUS}</dd>
            </div>
          </dl>

          <div class={styles.sidebarActions}>
            <button
              onclick={downloadPdf}
              class={cx(styles.actionButton, styles.actionButtonPrimary)}>
              Download
            </button>
            <button
              onclick={openInNativeViewer}
              class={styles.actionButton}>
              Open in tab
            </button>
            <button
              onclick={openPdfForPrinting}
              class={styles.actionButton}
              title={PDF_PRINT_ASSISTANCE_TEXT}>
              {PDF_PRINT_ACTION_LABEL}
            </button>
          </div>
        </aside>
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
              {statusMessage} You can open the PDF in your browser viewer, download it, print it, or retry the inline preview.
              {PDF_PRINT_ASSISTANCE_TEXT}
            </p>
          </div>

          <div class={styles.assistanceActions}>
            <button
              onclick={openInNativeViewer}
              class={cx(styles.actionButton, styles.actionButtonPrimary)}>
              Open PDF
            </button>
            <button
              onclick={downloadPdf}
              class={styles.actionButton}>
              Download
            </button>
            <button
              onclick={openPdfForPrinting}
              class={styles.actionButton}
              title={PDF_PRINT_ASSISTANCE_TEXT}>
              {PDF_PRINT_ACTION_LABEL}
            </button>
            <button
              onclick={retryNativeViewer}
              class={styles.actionButton}>
              Retry Preview
            </button>
          </div>
        </div>
      {/if}
    {:else}
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
  </section>
</div>
