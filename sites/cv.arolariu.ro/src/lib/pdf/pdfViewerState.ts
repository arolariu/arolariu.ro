/**
 * @fileoverview State helpers for the CV PDF route.
 *
 * @remarks
 * The route intentionally prefers browser-native PDF rendering so it does not
 * depend on PDF.js worker paths generated inside third-party package internals.
 */

/** Canonical CV PDF asset served from the SvelteKit static directory. */
export const PDF_ASSET_URL = "/cv.pdf";

/** Suggested filename for browser downloads. */
export const PDF_DOWNLOAD_FILENAME = "CV_AlexandruRazvan_Olariu.pdf";

/** Delay before showing assistance while keeping the native PDF surface mounted. */
export const PDF_NATIVE_ASSISTANCE_DELAY_MS = 3500;

/** Label for the route's browser-native print affordance. */
export const PDF_PRINT_ACTION_LABEL = "Print";

/** Help text describing how printing works in the browser-native PDF flow. */
export const PDF_PRINT_ASSISTANCE_TEXT = "Open the PDF in your browser viewer, then use the viewer's Print command.";

/** Browser-native PDF surface status. */
export type PdfSurfaceStatus = "loading" | "ready" | "needs-assistance" | "failed";

/** Events that can transition the browser-native PDF surface status. */
export type PdfSurfaceEvent = "load" | "timeout" | "error" | "retry";

/** Minimal device signals needed by the PDF route. */
export interface PdfDeviceSignals {
  readonly innerWidth: number;
  readonly maxTouchPoints: number;
  readonly userAgent: string;
}

/** PDF rendering preference derived from browser/device signals. */
export interface PdfDevicePreference {
  readonly isMobile: boolean;
  readonly prefersNativePdf: true;
}

/**
 * Detects whether the current device should receive the mobile PDF affordances.
 *
 * @param signals - Browser viewport, touch, and user-agent signals.
 * @returns Mobile classification and the native-first PDF preference.
 */
export function detectPdfDevice(signals: Readonly<PdfDeviceSignals>): PdfDevicePreference {
  const hasTouch = signals.maxTouchPoints > 0;
  const isSmallScreen = signals.innerWidth < 768;
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(signals.userAgent);

  return {
    isMobile: (hasTouch && isSmallScreen) || isMobileUserAgent,
    prefersNativePdf: true,
  };
}

/**
 * Computes the next PDF surface status for a route event.
 *
 * @param currentStatus - Current native PDF surface status.
 * @param event - Browser or user event that affects the native PDF surface.
 * @returns The next native PDF surface status.
 */
export function getNextPdfSurfaceStatus(currentStatus: PdfSurfaceStatus, event: PdfSurfaceEvent): PdfSurfaceStatus {
  switch (event) {
    case "load":
      return "ready";
    case "timeout":
      return currentStatus === "loading" ? "needs-assistance" : currentStatus;
    case "error":
      return "failed";
    case "retry":
      return "loading";
  }
}

/**
 * Determines whether users need explicit open/download/retry actions.
 *
 * @param status - Current native PDF surface status.
 * @returns `true` when assistance controls should be visible.
 */
export function shouldShowPdfAssistance(status: PdfSurfaceStatus): boolean {
  return status === "needs-assistance" || status === "failed";
}
