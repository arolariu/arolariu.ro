import {describe, expect, it} from "vitest";

import {
  PDF_ASSET_URL,
  PDF_DOWNLOAD_FILENAME,
  PDF_NATIVE_ASSISTANCE_DELAY_MS,
  PDF_PRINT_ACTION_LABEL,
  PDF_PRINT_ASSISTANCE_TEXT,
  detectPdfDevice,
  getNextPdfSurfaceStatus,
  shouldShowPdfAssistance,
} from "./pdfViewerState";

describe("PDF viewer state", () => {
  it("uses the static CV PDF as the single canonical asset", () => {
    expect(PDF_ASSET_URL).toBe("/cv.pdf");
    expect(PDF_DOWNLOAD_FILENAME).toBe("CV_AlexandruRazvan_Olariu.pdf");
  });

  it("detects small touch devices as mobile PDF devices", () => {
    const device = detectPdfDevice({
      innerWidth: 390,
      maxTouchPoints: 1,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    expect(device).toEqual({isMobile: true, prefersNativePdf: true});
  });

  it("keeps desktop devices native-first without classifying them as mobile", () => {
    const device = detectPdfDevice({
      innerWidth: 1440,
      maxTouchPoints: 0,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });

    expect(device).toEqual({isMobile: false, prefersNativePdf: true});
  });

  it("moves from loading to ready when the browser PDF surface loads", () => {
    expect(getNextPdfSurfaceStatus("loading", "load")).toBe("ready");
  });

  it("shows assistance instead of replacing the native PDF surface after a load timeout", () => {
    expect(getNextPdfSurfaceStatus("loading", "timeout")).toBe("needs-assistance");
  });

  it("shows the explicit fallback actions when the browser reports an embed error", () => {
    expect(getNextPdfSurfaceStatus("loading", "error")).toBe("failed");
    expect(getNextPdfSurfaceStatus("needs-assistance", "error")).toBe("failed");
  });

  it("allows users to retry the native PDF surface from a degraded state", () => {
    expect(getNextPdfSurfaceStatus("failed", "retry")).toBe("loading");
    expect(getNextPdfSurfaceStatus("needs-assistance", "retry")).toBe("loading");
  });

  it("shows assistance for timeout and failure states only", () => {
    expect(shouldShowPdfAssistance("loading")).toBe(false);
    expect(shouldShowPdfAssistance("ready")).toBe(false);
    expect(shouldShowPdfAssistance("needs-assistance")).toBe(true);
    expect(shouldShowPdfAssistance("failed")).toBe(true);
  });

  it("uses a short assistance delay so mobile users are not left on a blank PDF frame", () => {
    expect(PDF_NATIVE_ASSISTANCE_DELAY_MS).toBeGreaterThanOrEqual(2500);
    expect(PDF_NATIVE_ASSISTANCE_DELAY_MS).toBeLessThanOrEqual(5000);
  });

  it("describes printing as a browser-native PDF viewer action", () => {
    expect(PDF_PRINT_ACTION_LABEL).toBe("Print");
    expect(PDF_PRINT_ASSISTANCE_TEXT).toContain("Open");
    expect(PDF_PRINT_ASSISTANCE_TEXT).toContain("browser");
    expect(PDF_PRINT_ASSISTANCE_TEXT).toContain("Print");
  });
});
