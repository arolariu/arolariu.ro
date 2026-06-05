/**
 * @fileoverview MIME type normalization and conversion utilities for invoice scans.
 * @module domains/invoices/_utils/mimeTypeUtilities
 *
 * @remarks
 * This module provides centralized utilities for:
 * - Normalizing MIME types with alias resolution (e.g., image/jpg → image/jpeg)
 * - Converting between MIME types, ScanType, and InvoiceScanType
 * - Extracting and validating file extensions
 * - Checking MIME type and extension support
 *
 * **Design Principles:**
 * - Pure functions with no side effects
 * - Explicit mappings for all supported formats
 * - Null returns for unsupported inputs (no exceptions for invalid data)
 * - Case-insensitive handling of MIME types and extensions
 *
 * **Supported Formats:**
 * - Images: JPEG, PNG, BMP, TIFF, HEIF, HEIC
 * - Documents: PDF
 *
 * @example
 * ```typescript
 * // Normalize MIME type with whitespace and alias
 * const normalized = normalizeScanMimeType(" image/JPG ");
 * console.log(normalized); // "image/jpeg"
 *
 * // Convert MIME type to ScanType
 * const scanType = mimeTypeToScanType("image/png");
 * console.log(scanType); // ScanType.PNG
 *
 * // Extract file extension
 * const ext = extractFileExtension("receipt.final.JPG");
 * console.log(ext); // "jpg"
 * ```
 */

import {
	deriveBlobExtension as deriveGenericBlobExtension,
	extractFileExtension as extractGenericFileExtension,
	getCanonicalMimeTypeForExtension,
	isExtensionInSet,
	normalizeMimeTypeWithAliases,
} from "@/lib/utils.generic";
import type {InvoiceScanType} from "@/types/invoices";
import type {ScanType} from "@/types/scans";
import {InvoiceScanType as InvoiceScanTypeEnum} from "@/types/invoices";
import {ScanType as ScanTypeEnum} from "@/types/scans";

/**
 * Immutable array of accepted MIME types for invoice scans in canonical form.
 *
 * @remarks
 * This array contains only the canonical MIME type representations.
 * Aliases (e.g., image/jpg, image/pjpeg) are normalized to canonical
 * forms via {@link normalizeScanMimeType} before checking support.
 *
 * **Supported Formats:**
 * - `image/jpeg` - JPEG images (aliases: jpg, pjpeg)
 * - `image/png` - PNG images
 * - `image/bmp` - Bitmap images (alias: x-ms-bmp)
 * - `image/tiff` - TIFF images (aliases: tif, x-tiff)
 * - `image/heif` - High Efficiency Image Format
 * - `image/heic` - High Efficiency Image Codec
 * - `application/pdf` - PDF documents
 *
 * @example
 * ```typescript
 * if (ACCEPTED_SCAN_MIME_TYPES.includes(normalizedMimeType)) {
 *   // Process supported format
 * }
 * ```
 */
export const ACCEPTED_SCAN_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/bmp",
	"image/tiff",
	"image/heif",
	"image/heic",
	"application/pdf",
] as const;

/**
 * Immutable array of accepted file extensions for invoice scans.
 *
 * @remarks
 * Extensions are stored in lowercase without leading dots.
 * Both `jpg` and `jpeg` are accepted for JPEG images.
 * Both `tif` and `tiff` are accepted for TIFF images.
 *
 * **Supported Extensions:**
 * - `jpg`, `jpeg` - JPEG images
 * - `png` - PNG images
 * - `bmp` - Bitmap images
 * - `tif`, `tiff` - TIFF images
 * - `heif` - High Efficiency Image Format
 * - `heic` - High Efficiency Image Codec
 * - `pdf` - PDF documents
 *
 * @example
 * ```typescript
 * const ext = extractFileExtension(filename);
 * if (ext && ACCEPTED_SCAN_FILE_EXTENSIONS.includes(ext)) {
 *   // Valid scan file
 * }
 * ```
 */
export const ACCEPTED_SCAN_FILE_EXTENSIONS = [
	"jpg",
	"jpeg",
	"png",
	"bmp",
	"tif",
	"tiff",
	"heif",
	"heic",
	"pdf",
] as const;

/**
 * Internal Set for efficient MIME type lookups.
 * @internal
 */
const _ACCEPTED_SCAN_MIME_TYPES_SET = new Set<string>(ACCEPTED_SCAN_MIME_TYPES);

/**
 * Internal Set for efficient extension lookups.
 * @internal
 */
const _ACCEPTED_SCAN_FILE_EXTENSIONS_SET = new Set<string>(ACCEPTED_SCAN_FILE_EXTENSIONS);

/**
 * MIME type alias mappings to canonical forms.
 *
 * @remarks
 * Maps non-canonical MIME types to their canonical equivalents.
 * Used internally by {@link normalizeScanMimeType} for normalization.
 *
 * **Common Aliases:**
 * - `image/jpg` → `image/jpeg` (incorrect but common)
 * - `image/pjpeg` → `image/jpeg` (progressive JPEG)
 * - `image/tif` → `image/tiff` (abbreviated form)
 * - `image/x-tiff` → `image/tiff` (vendor prefix)
 * - `image/x-ms-bmp` → `image/bmp` (Microsoft vendor prefix)
 *
 * @internal
 */
const MIME_TYPE_ALIASES: Readonly<Record<string, string>> = {
	"image/jpg": "image/jpeg",
	"image/pjpeg": "image/jpeg",
	"image/tif": "image/tiff",
	"image/x-tiff": "image/tiff",
	"image/x-ms-bmp": "image/bmp",
};

/**
 * Mapping from file extensions to canonical MIME types.
 *
 * @remarks
 * Provides reverse lookup from extension to MIME type.
 * Used by {@link getMimeTypeForExtension}.
 *
 * @internal
 */
const EXTENSION_TO_MIME: Readonly<Record<string, string>> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	bmp: "image/bmp",
	tif: "image/tiff",
	tiff: "image/tiff",
	heif: "image/heif",
	heic: "image/heic",
	pdf: "application/pdf",
};

/**
 * Mapping from canonical MIME types to ScanType enum values.
 *
 * @remarks
 * Explicit mapping ensures type safety and makes supported
 * formats immediately visible in code.
 *
 * @internal
 */
const MIME_TO_SCAN_TYPE: Readonly<Record<string, ScanType>> = {
	"image/jpeg": ScanTypeEnum.JPEG,
	"image/png": ScanTypeEnum.PNG,
	"image/bmp": ScanTypeEnum.BMP,
	"image/tiff": ScanTypeEnum.TIFF,
	"image/heif": ScanTypeEnum.HEIF,
	"image/heic": ScanTypeEnum.HEIC,
	"application/pdf": ScanTypeEnum.PDF,
};

/**
 * Mapping from canonical MIME types to InvoiceScanType enum values.
 *
 * @remarks
 * Explicit mapping for invoice scan type conversion.
 * Note that InvoiceScanType has both JPEG and JPG variants
 * (numeric enum values 0 and 1), but we map to JPEG.
 *
 * @internal
 */
const MIME_TO_INVOICE_SCAN_TYPE: Readonly<Record<string, InvoiceScanType>> = {
	"image/jpeg": InvoiceScanTypeEnum.JPEG,
	"image/png": InvoiceScanTypeEnum.PNG,
	"image/bmp": InvoiceScanTypeEnum.BMP,
	"image/tiff": InvoiceScanTypeEnum.TIFF,
	"image/heif": InvoiceScanTypeEnum.HEIF,
	"image/heic": InvoiceScanTypeEnum.HEIC,
	"application/pdf": InvoiceScanTypeEnum.PDF,
};

/**
 * Mapping from ScanType to InvoiceScanType.
 *
 * @remarks
 * Converts between the two type systems. ScanType.OTHER maps to
 * InvoiceScanType.UNKNOWN as they serve equivalent roles.
 *
 * @internal
 */
const SCAN_TYPE_TO_INVOICE_SCAN_TYPE: Readonly<Record<string, InvoiceScanType>> = {
	[ScanTypeEnum.JPEG]: InvoiceScanTypeEnum.JPEG,
	[ScanTypeEnum.PNG]: InvoiceScanTypeEnum.PNG,
	[ScanTypeEnum.BMP]: InvoiceScanTypeEnum.BMP,
	[ScanTypeEnum.TIFF]: InvoiceScanTypeEnum.TIFF,
	[ScanTypeEnum.HEIF]: InvoiceScanTypeEnum.HEIF,
	[ScanTypeEnum.HEIC]: InvoiceScanTypeEnum.HEIC,
	[ScanTypeEnum.PDF]: InvoiceScanTypeEnum.PDF,
	[ScanTypeEnum.OTHER]: InvoiceScanTypeEnum.UNKNOWN,
};

/**
 * Normalizes a MIME type string to canonical form for invoice scans.
 *
 * @param mimeType - The MIME type to normalize (may contain whitespace, aliases, mixed case)
 * @returns The canonical MIME type if supported, otherwise `null`
 *
 * @remarks
 * **Normalization Steps:**
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Apply alias mappings (e.g., image/jpg → image/jpeg)
 * 4. Verify result is in accepted set
 *
 * **Return Value:**
 * - Returns canonical MIME type for supported formats
 * - Returns `null` for unsupported or invalid inputs
 * - Empty strings return `null`
 *
 * @example
 * ```typescript
 * normalizeScanMimeType(" image/JPG ")  // "image/jpeg"
 * normalizeScanMimeType("image/pjpeg")  // "image/jpeg"
 * normalizeScanMimeType("image/tif")    // "image/tiff"
 * normalizeScanMimeType("image/gif")    // null
 * normalizeScanMimeType("")             // null
 * ```
 */
export function normalizeScanMimeType(mimeType: string): string | null {
	return normalizeMimeTypeWithAliases(mimeType, MIME_TYPE_ALIASES, _ACCEPTED_SCAN_MIME_TYPES_SET);
}

/**
 * Extracts the file extension from a filename.
 *
 * @param fileName - The filename to extract extension from
 * @returns The lowercase extension without dot, or `null` if no valid extension
 *
 * @remarks
 * **Extraction Rules:**
 * - Takes the last segment after the final dot
 * - Normalizes to lowercase
 * - Returns `null` if no dot or extension is empty
 *
 * **Behavior:**
 * - `"receipt.jpg"` → `"jpg"`
 * - `"file.final.PDF"` → `"pdf"`
 * - `"nodot"` → `null`
 * - `"endswithdot."` → `null`
 *
 * @example
 * ```typescript
 * extractFileExtension("receipt.final.JPG")  // "jpg"
 * extractFileExtension("scan.pdf")           // "pdf"
 * extractFileExtension("noextension")        // null
 * extractFileExtension("ends.")              // null
 * ```
 */
export function extractFileExtension(fileName: string): string | null {
	return extractGenericFileExtension(fileName);
}

/**
 * Derives a blob-safe file extension from a filename.
 *
 * @param fileName - The filename to extract extension from
 * @returns The lowercase extension, or `"bin"` if no valid extension
 *
 * @remarks
 * This is a non-null variant of {@link extractFileExtension} that
 * provides a fallback extension for binary data.
 *
 * **Use Case:**
 * Ensures Azure Blob Storage always has a file extension, even for
 * files without recognized extensions.
 *
 * @example
 * ```typescript
 * deriveBlobExtension("receipt")       // "bin"
 * deriveBlobExtension("scan.TIFF")     // "tiff"
 * deriveBlobExtension("file.data")     // "data"
 * ```
 */
export function deriveBlobExtension(fileName: string): string {
	return deriveGenericBlobExtension(fileName);
}

/**
 * Converts a MIME type to a ScanType enum value.
 *
 * @param mimeType - The MIME type to convert
 * @returns The corresponding ScanType, or `ScanType.OTHER` for unsupported types
 *
 * @remarks
 * **Conversion Process:**
 * 1. Normalize the MIME type (handles aliases and casing)
 * 2. Look up in MIME-to-ScanType mapping
 * 3. Return `ScanType.OTHER` if not found
 *
 * **Behavior:**
 * - Canonical MIME types map to specific ScanType values
 * - Aliases are resolved (e.g., image/jpg → ScanType.JPEG)
 * - Unsupported or empty inputs return `ScanType.OTHER`
 *
 * @example
 * ```typescript
 * mimeTypeToScanType("image/jpeg")      // ScanType.JPEG
 * mimeTypeToScanType("image/png")       // ScanType.PNG
 * mimeTypeToScanType("application/pdf") // ScanType.PDF
 * mimeTypeToScanType("image/gif")       // ScanType.OTHER
 * mimeTypeToScanType("")                // ScanType.OTHER
 * ```
 */
export function mimeTypeToScanType(mimeType: string): ScanType {
	const normalized = normalizeScanMimeType(mimeType);
	if (!normalized) return ScanTypeEnum.OTHER;

	return MIME_TO_SCAN_TYPE[normalized] ?? ScanTypeEnum.OTHER;
}

/**
 * Converts a MIME type to an InvoiceScanType enum value.
 *
 * @param mimeType - The MIME type to convert
 * @returns The corresponding InvoiceScanType, or `InvoiceScanType.UNKNOWN` for unsupported types
 *
 * @remarks
 * **Conversion Process:**
 * 1. Normalize the MIME type (handles aliases and casing)
 * 2. Look up in MIME-to-InvoiceScanType mapping
 * 3. Return `InvoiceScanType.UNKNOWN` if not found
 *
 * **Behavior:**
 * - Canonical MIME types map to specific InvoiceScanType values
 * - Aliases are resolved (e.g., image/jpg → InvoiceScanType.JPEG)
 * - Unsupported or empty inputs return `InvoiceScanType.UNKNOWN`
 *
 * @example
 * ```typescript
 * mimeTypeToInvoiceScanType("image/jpeg")      // InvoiceScanType.JPEG
 * mimeTypeToInvoiceScanType("image/png")       // InvoiceScanType.PNG
 * mimeTypeToInvoiceScanType("application/pdf") // InvoiceScanType.PDF
 * mimeTypeToInvoiceScanType("image/gif")       // InvoiceScanType.UNKNOWN
 * mimeTypeToInvoiceScanType("")                // InvoiceScanType.UNKNOWN
 * ```
 */
export function mimeTypeToInvoiceScanType(mimeType: string): InvoiceScanType {
	const normalized = normalizeScanMimeType(mimeType);
	if (!normalized) return InvoiceScanTypeEnum.UNKNOWN;

	return MIME_TO_INVOICE_SCAN_TYPE[normalized] ?? InvoiceScanTypeEnum.UNKNOWN;
}

/**
 * Converts a ScanType to an InvoiceScanType.
 *
 * @param scanType - The ScanType to convert
 * @returns The corresponding InvoiceScanType
 *
 * @remarks
 * **Mapping Logic:**
 * - Each specific ScanType maps to its InvoiceScanType equivalent
 * - `ScanType.OTHER` maps to `InvoiceScanType.UNKNOWN`
 *
 * **Type Safety:**
 * All ScanType values are explicitly mapped to prevent runtime errors.
 *
 * @example
 * ```typescript
 * scanTypeToInvoiceScanType(ScanType.JPEG)  // InvoiceScanType.JPEG
 * scanTypeToInvoiceScanType(ScanType.PNG)   // InvoiceScanType.PNG
 * scanTypeToInvoiceScanType(ScanType.PDF)   // InvoiceScanType.PDF
 * scanTypeToInvoiceScanType(ScanType.OTHER) // InvoiceScanType.UNKNOWN
 * ```
 */
export function scanTypeToInvoiceScanType(scanType: ScanType): InvoiceScanType {
	return SCAN_TYPE_TO_INVOICE_SCAN_TYPE[scanType] ?? InvoiceScanTypeEnum.UNKNOWN;
}

/**
 * Gets the canonical MIME type for a file extension.
 *
 * @param extension - The file extension (with or without leading dot, any case)
 * @returns The canonical MIME type, or `null` if extension is not supported
 *
 * @remarks
 * **Normalization:**
 * - Leading dots are stripped
 * - Extension is converted to lowercase
 * - Both `jpg` and `jpeg` map to `image/jpeg`
 * - Both `tif` and `tiff` map to `image/tiff`
 *
 * **Behavior:**
 * - Returns canonical MIME type for supported extensions
 * - Returns `null` for unsupported extensions
 *
 * @example
 * ```typescript
 * getMimeTypeForExtension("jpg")   // "image/jpeg"
 * getMimeTypeForExtension(".PNG")  // "image/png"
 * getMimeTypeForExtension("pdf")   // "application/pdf"
 * getMimeTypeForExtension("txt")   // null
 * ```
 */
export function getMimeTypeForExtension(extension: string): string | null {
	return getCanonicalMimeTypeForExtension(extension, EXTENSION_TO_MIME);
}

/**
 * Checks if a MIME type is supported for invoice scans.
 *
 * @param mimeType - The MIME type to check
 * @returns `true` if the MIME type is supported (including aliases), `false` otherwise
 *
 * @remarks
 * **Behavior:**
 * - Accepts canonical MIME types (e.g., image/jpeg)
 * - Accepts aliases (e.g., image/jpg, image/pjpeg)
 * - Case-insensitive
 * - Handles whitespace
 *
 * @example
 * ```typescript
 * isSupportedScanMimeType("image/jpeg")   // true
 * isSupportedScanMimeType("image/jpg")    // true (alias)
 * isSupportedScanMimeType("IMAGE/PNG")    // true (case-insensitive)
 * isSupportedScanMimeType("image/gif")    // false
 * ```
 */
export function isSupportedScanMimeType(mimeType: string): boolean {
	return normalizeScanMimeType(mimeType) !== null;
}

/**
 * Checks if a file extension is supported for invoice scans.
 *
 * @param extension - The file extension to check (with or without leading dot, any case)
 * @returns `true` if the extension is supported, `false` otherwise
 *
 * @remarks
 * **Behavior:**
 * - Accepts extensions with or without leading dot
 * - Case-insensitive
 * - Both `jpg` and `jpeg` are supported
 * - Both `tif` and `tiff` are supported
 *
 * @example
 * ```typescript
 * isSupportedScanExtension("jpg")   // true
 * isSupportedScanExtension(".PNG")  // true
 * isSupportedScanExtension("PDF")   // true
 * isSupportedScanExtension("txt")   // false
 * ```
 */
export function isSupportedScanExtension(extension: string): boolean {
	return isExtensionInSet(extension, _ACCEPTED_SCAN_FILE_EXTENSIONS_SET);
}
