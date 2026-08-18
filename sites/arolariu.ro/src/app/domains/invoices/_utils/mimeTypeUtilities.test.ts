/**
 * @fileoverview Unit tests for MIME type utility functions.
 * @module domains/invoices/_utils/mimeTypeUtilities.test
 */

import {InvoiceScanType} from "@/types/invoices";
import {ScanType} from "@/types/scans";
import {describe, expect, it} from "vitest";
import {
  ACCEPTED_SCAN_FILE_EXTENSIONS,
  ACCEPTED_SCAN_MIME_TYPES,
  deriveBlobExtension,
  extractFileExtension,
  getMimeTypeForExtension,
  isSupportedScanExtension,
  isSupportedScanMimeType,
  mimeTypeToInvoiceScanType,
  mimeTypeToScanType,
  normalizeScanMimeType,
  scanTypeToInvoiceScanType,
} from "./mimeTypeUtilities";

describe("mimeTypeUtilities", () => {
  describe("normalizeScanMimeType", () => {
    it("should normalize JPEG alias with whitespace", () => {
      expect(normalizeScanMimeType(" image/JPG ")).toBe("image/jpeg");
    });

    it("should normalize TIFF alias", () => {
      expect(normalizeScanMimeType("image/tif")).toBe("image/tiff");
    });

    it("should reject HEIC with uppercase", () => {
      expect(normalizeScanMimeType("IMAGE/HEIC")).toBeNull();
    });

    it("should return null for unknown input", () => {
      expect(normalizeScanMimeType("image/unknown")).toBeNull();
    });

    it("should return null for empty input", () => {
      expect(normalizeScanMimeType("")).toBeNull();
    });

    it("should normalize pjpeg alias", () => {
      expect(normalizeScanMimeType("image/pjpeg")).toBe("image/jpeg");
    });

    it("should normalize x-tiff alias", () => {
      expect(normalizeScanMimeType("image/x-tiff")).toBe("image/tiff");
    });

    it("should normalize x-ms-bmp alias", () => {
      expect(normalizeScanMimeType("image/x-ms-bmp")).toBe("image/bmp");
    });

    it("should handle already canonical MIME types", () => {
      expect(normalizeScanMimeType("image/jpeg")).toBe("image/jpeg");
      expect(normalizeScanMimeType("image/png")).toBe("image/png");
      expect(normalizeScanMimeType("application/pdf")).toBe("application/pdf");
    });
  });

  describe("ACCEPTED_SCAN_MIME_TYPES", () => {
    it("should include canonical forms for JPEG", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES).toContain("image/jpeg");
    });

    it("should include canonical forms for PNG", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES).toContain("image/png");
    });

    it("should include canonical forms for BMP", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES).toContain("image/bmp");
    });

    it("should include canonical forms for TIFF", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES).toContain("image/tiff");
    });

    it("should include canonical forms for HEIF", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES).toContain("image/heif");
    });

    it("should include canonical forms for PDF", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES).toContain("application/pdf");
    });

    it("should have exactly 6 supported MIME types", () => {
      expect(ACCEPTED_SCAN_MIME_TYPES.length).toBe(6);
    });

    it("should not expose Set mutating methods", () => {
      expect("add" in ACCEPTED_SCAN_MIME_TYPES).toBe(false);
      expect("delete" in ACCEPTED_SCAN_MIME_TYPES).toBe(false);
      expect("clear" in ACCEPTED_SCAN_MIME_TYPES).toBe(false);
    });

    it("should be a readonly array", () => {
      expect(Array.isArray(ACCEPTED_SCAN_MIME_TYPES)).toBe(true);
    });
  });

  describe("ACCEPTED_SCAN_FILE_EXTENSIONS", () => {
    it("should include jpg extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("jpg");
    });

    it("should include jpeg extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("jpeg");
    });

    it("should include png extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("png");
    });

    it("should include bmp extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("bmp");
    });

    it("should include tif extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("tif");
    });

    it("should include tiff extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("tiff");
    });

    it("should include heif extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("heif");
    });

    it("should include pdf extension", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toContain("pdf");
    });

    it("should have exactly 8 supported extensions", () => {
      expect(ACCEPTED_SCAN_FILE_EXTENSIONS.length).toBe(8);
    });

    it("should not expose Set mutating methods", () => {
      expect("add" in ACCEPTED_SCAN_FILE_EXTENSIONS).toBe(false);
      expect("delete" in ACCEPTED_SCAN_FILE_EXTENSIONS).toBe(false);
      expect("clear" in ACCEPTED_SCAN_FILE_EXTENSIONS).toBe(false);
    });

    it("should be a readonly array", () => {
      expect(Array.isArray(ACCEPTED_SCAN_FILE_EXTENSIONS)).toBe(true);
    });
  });

  describe("extractFileExtension", () => {
    it("should extract extension from multi-dot filename", () => {
      expect(extractFileExtension("receipt.final.JPG")).toBe("jpg");
    });

    it("should return null for filename without extension", () => {
      expect(extractFileExtension("receipt")).toBeNull();
    });

    it("should return null for filename ending with dot", () => {
      expect(extractFileExtension("receipt.")).toBeNull();
    });

    it("should handle simple filename with extension", () => {
      expect(extractFileExtension("scan.pdf")).toBe("pdf");
    });

    it("should normalize extension to lowercase", () => {
      expect(extractFileExtension("image.PNG")).toBe("png");
    });
  });

  describe("deriveBlobExtension", () => {
    it("should return bin for filename without extension", () => {
      expect(deriveBlobExtension("receipt")).toBe("bin");
    });

    it("should extract extension from filename with TIFF", () => {
      expect(deriveBlobExtension("scan.TIFF")).toBe("tiff");
    });

    it("should extract extension from complex filename", () => {
      expect(deriveBlobExtension("document.final.v2.PDF")).toBe("pdf");
    });

    it("should return bin for empty filename", () => {
      expect(deriveBlobExtension("")).toBe("bin");
    });

    it("should return bin for dot-only filename", () => {
      expect(deriveBlobExtension(".")).toBe("bin");
    });
  });

  describe("mimeTypeToScanType", () => {
    it("should map image/jpeg to ScanType.JPEG", () => {
      expect(mimeTypeToScanType("image/jpeg")).toBe(ScanType.JPEG);
    });

    it("should map image/png to ScanType.PNG", () => {
      expect(mimeTypeToScanType("image/png")).toBe(ScanType.PNG);
    });

    it("should map image/bmp to ScanType.BMP", () => {
      expect(mimeTypeToScanType("image/bmp")).toBe(ScanType.BMP);
    });

    it("should map image/tiff to ScanType.TIFF", () => {
      expect(mimeTypeToScanType("image/tiff")).toBe(ScanType.TIFF);
    });

    it("should map image/heif to ScanType.HEIF", () => {
      expect(mimeTypeToScanType("image/heif")).toBe(ScanType.HEIF);
    });

    it("should reject image/heic", () => {
      expect(mimeTypeToScanType("image/heic")).toBe(ScanType.OTHER);
    });

    it("should map application/pdf to ScanType.PDF", () => {
      expect(mimeTypeToScanType("application/pdf")).toBe(ScanType.PDF);
    });

    it("should return ScanType.OTHER for unsupported MIME type", () => {
      expect(mimeTypeToScanType("image/unknown")).toBe(ScanType.OTHER);
    });

    it("should return ScanType.OTHER for empty value", () => {
      expect(mimeTypeToScanType("")).toBe(ScanType.OTHER);
    });
  });

  describe("mimeTypeToInvoiceScanType", () => {
    it("should map image/jpeg to InvoiceScanType.JPEG", () => {
      expect(mimeTypeToInvoiceScanType("image/jpeg")).toBe(InvoiceScanType.JPEG);
    });

    it("should map image/png to InvoiceScanType.PNG", () => {
      expect(mimeTypeToInvoiceScanType("image/png")).toBe(InvoiceScanType.PNG);
    });

    it("should map image/bmp to InvoiceScanType.BMP", () => {
      expect(mimeTypeToInvoiceScanType("image/bmp")).toBe(InvoiceScanType.BMP);
    });

    it("should map image/tiff to InvoiceScanType.TIFF", () => {
      expect(mimeTypeToInvoiceScanType("image/tiff")).toBe(InvoiceScanType.TIFF);
    });

    it("should map image/heif to InvoiceScanType.HEIF", () => {
      expect(mimeTypeToInvoiceScanType("image/heif")).toBe(InvoiceScanType.HEIF);
    });

    it("should reject image/heic", () => {
      expect(mimeTypeToInvoiceScanType("image/heic")).toBe(InvoiceScanType.UNKNOWN);
    });

    it("should map application/pdf to InvoiceScanType.PDF", () => {
      expect(mimeTypeToInvoiceScanType("application/pdf")).toBe(InvoiceScanType.PDF);
    });

    it("should return InvoiceScanType.UNKNOWN for unsupported MIME type", () => {
      expect(mimeTypeToInvoiceScanType("image/unknown")).toBe(InvoiceScanType.UNKNOWN);
    });

    it("should return InvoiceScanType.UNKNOWN for empty value", () => {
      expect(mimeTypeToInvoiceScanType("")).toBe(InvoiceScanType.UNKNOWN);
    });
  });

  describe("scanTypeToInvoiceScanType", () => {
    it("should map ScanType.JPEG to InvoiceScanType.JPEG", () => {
      expect(scanTypeToInvoiceScanType(ScanType.JPEG)).toBe(InvoiceScanType.JPEG);
    });

    it("should map ScanType.PNG to InvoiceScanType.PNG", () => {
      expect(scanTypeToInvoiceScanType(ScanType.PNG)).toBe(InvoiceScanType.PNG);
    });

    it("should map ScanType.BMP to InvoiceScanType.BMP", () => {
      expect(scanTypeToInvoiceScanType(ScanType.BMP)).toBe(InvoiceScanType.BMP);
    });

    it("should map ScanType.TIFF to InvoiceScanType.TIFF", () => {
      expect(scanTypeToInvoiceScanType(ScanType.TIFF)).toBe(InvoiceScanType.TIFF);
    });

    it("should map ScanType.HEIF to InvoiceScanType.HEIF", () => {
      expect(scanTypeToInvoiceScanType(ScanType.HEIF)).toBe(InvoiceScanType.HEIF);
    });

    it("should map ScanType.PDF to InvoiceScanType.PDF", () => {
      expect(scanTypeToInvoiceScanType(ScanType.PDF)).toBe(InvoiceScanType.PDF);
    });

    it("should map ScanType.OTHER to InvoiceScanType.UNKNOWN", () => {
      expect(scanTypeToInvoiceScanType(ScanType.OTHER)).toBe(InvoiceScanType.UNKNOWN);
    });
  });

  describe("getMimeTypeForExtension", () => {
    it("should map jpg to image/jpeg", () => {
      expect(getMimeTypeForExtension("jpg")).toBe("image/jpeg");
    });

    it("should map jpeg to image/jpeg", () => {
      expect(getMimeTypeForExtension("jpeg")).toBe("image/jpeg");
    });

    it("should map png to image/png", () => {
      expect(getMimeTypeForExtension("png")).toBe("image/png");
    });

    it("should map bmp to image/bmp", () => {
      expect(getMimeTypeForExtension("bmp")).toBe("image/bmp");
    });

    it("should map tif to image/tiff", () => {
      expect(getMimeTypeForExtension("tif")).toBe("image/tiff");
    });

    it("should map tiff to image/tiff", () => {
      expect(getMimeTypeForExtension("tiff")).toBe("image/tiff");
    });

    it("should map heif to image/heif", () => {
      expect(getMimeTypeForExtension("heif")).toBe("image/heif");
    });

    it("should reject heic", () => {
      expect(getMimeTypeForExtension("heic")).toBeNull();
    });

    it("should map pdf to application/pdf", () => {
      expect(getMimeTypeForExtension("pdf")).toBe("application/pdf");
    });

    it("should return null for unsupported extension", () => {
      expect(getMimeTypeForExtension("txt")).toBeNull();
    });

    it("should handle uppercase extension", () => {
      expect(getMimeTypeForExtension("JPG")).toBe("image/jpeg");
    });

    it("should handle extension with leading dot", () => {
      expect(getMimeTypeForExtension(".png")).toBe("image/png");
    });
  });

  describe("isSupportedScanMimeType", () => {
    it("should return true for canonical MIME types", () => {
      expect(isSupportedScanMimeType("image/jpeg")).toBe(true);
      expect(isSupportedScanMimeType("image/png")).toBe(true);
      expect(isSupportedScanMimeType("application/pdf")).toBe(true);
    });

    it("should return true for aliases through normalization", () => {
      expect(isSupportedScanMimeType("image/jpg")).toBe(true);
      expect(isSupportedScanMimeType("image/pjpeg")).toBe(true);
      expect(isSupportedScanMimeType("image/tif")).toBe(true);
    });

    it("should return false for unsupported MIME types", () => {
      expect(isSupportedScanMimeType("image/gif")).toBe(false);
      expect(isSupportedScanMimeType("image/heic")).toBe(false);
      expect(isSupportedScanMimeType("text/plain")).toBe(false);
    });

    it("should handle casing variations", () => {
      expect(isSupportedScanMimeType("IMAGE/JPEG")).toBe(true);
    });
  });

  describe("isSupportedScanExtension", () => {
    it("should return true for supported extensions", () => {
      expect(isSupportedScanExtension("jpg")).toBe(true);
      expect(isSupportedScanExtension("png")).toBe(true);
      expect(isSupportedScanExtension("pdf")).toBe(true);
    });

    it("should accept leading dots", () => {
      expect(isSupportedScanExtension(".jpg")).toBe(true);
      expect(isSupportedScanExtension(".png")).toBe(true);
    });

    it("should accept casing variations", () => {
      expect(isSupportedScanExtension("JPG")).toBe(true);
      expect(isSupportedScanExtension("PDF")).toBe(true);
    });

    it("should return false for unsupported extensions", () => {
      expect(isSupportedScanExtension("txt")).toBe(false);
      expect(isSupportedScanExtension("gif")).toBe(false);
      expect(isSupportedScanExtension("heic")).toBe(false);
    });
  });
});
