/**
 * @fileoverview Upload file fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/uploadFixtures
 */

/** Minimal single-page PDF document used to back PDF story files. */
const MINIMAL_PDF_DOCUMENT = [
	"%PDF-1.4",
	"1 0 obj",
	"<< /Type /Catalog /Pages 2 0 R >>",
	"endobj",
	"2 0 obj",
	"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
	"endobj",
	"3 0 obj",
	"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1 1] >>",
	"endobj",
	"xref",
	"0 4",
	"0000000000 65535 f ",
	"0000000015 00000 n ",
	"0000000068 00000 n ",
	"0000000125 00000 n ",
	"trailer",
	"<< /Root 1 0 R /Size 4 >>",
	"startxref",
	"196",
	"%%EOF",
].join("\n");

/**
 * Builds the bytes of a solid-color 24-bit BMP image.
 *
 * @remarks
 * BMP is used because it can be constructed deterministically without external
 * binary assets or canvas APIs (so it works in both the browser and jsdom).
 * Browsers content-sniff the `BM` signature and render it in an `<img>` even
 * when the surrounding blob advertises a different image MIME type.
 *
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param rgb - Fill color as an `[r, g, b]` tuple (0-255).
 * @returns The BMP file bytes.
 */
function createBmpBytes(width: number, height: number, rgb: readonly [number, number, number]): Uint8Array<ArrayBuffer> {
	const rowSize = Math.ceil((width * 3) / 4) * 4;
	const pixelDataSize = rowSize * height;
	const fileSize = 54 + pixelDataSize;
	const bytes = new Uint8Array(fileSize);
	const view = new DataView(bytes.buffer);

	// BMP file header (14 bytes).
	bytes[0] = 0x42; // "B"
	bytes[1] = 0x4d; // "M"
	view.setUint32(2, fileSize, true);
	view.setUint32(10, 54, true); // Pixel data offset.

	// DIB header (BITMAPINFOHEADER, 40 bytes).
	view.setUint32(14, 40, true); // Header size.
	view.setInt32(18, width, true);
	view.setInt32(22, height, true);
	view.setUint16(26, 1, true); // Color planes.
	view.setUint16(28, 24, true); // Bits per pixel.
	view.setUint32(30, 0, true); // No compression.
	view.setUint32(34, pixelDataSize, true);

	const [r, g, b] = rgb;
	for (let y = 0; y < height; y += 1) {
		const rowStart = 54 + y * rowSize;
		for (let x = 0; x < width; x += 1) {
			const offset = rowStart + x * 3;
			bytes[offset] = b;
			bytes[offset + 1] = g;
			bytes[offset + 2] = r;
		}
	}

	return bytes;
}

/**
 * Produces valid file content for the given MIME type.
 *
 * @remarks
 * - Images receive a real BMP so previews render instead of breaking.
 * - PDFs receive a minimal valid single-page document.
 * - Anything else falls back to zeroed bytes.
 *
 * The seed content is padded with trailing zeros to honor the requested `size`.
 * Trailing bytes after a BMP's pixel data or a PDF's `%%EOF` marker are ignored
 * by decoders, so padding does not corrupt the file.
 *
 * @param type - The MIME type to generate content for.
 * @param size - The desired file size in bytes.
 * @returns The file content bytes.
 */
function createFileContent(type: string, size: number): Uint8Array<ArrayBuffer> {
	let seed: Uint8Array<ArrayBuffer>;
	if (type === "application/pdf") {
		const encoded = new TextEncoder().encode(MINIMAL_PDF_DOCUMENT);
		seed = new Uint8Array(encoded.length);
		seed.set(encoded);
	} else if (type.startsWith("image/")) {
		// A 16x16 slate-blue square reads clearly as an image preview.
		seed = createBmpBytes(16, 16, [99, 102, 241]);
	} else {
		seed = new Uint8Array(0);
	}

	if (size <= seed.length) {
		return seed;
	}

	const buffer = new Uint8Array(size);
	buffer.set(seed, 0);
	return buffer;
}

/**
 * Creates a mock File object for testing file uploads.
 *
 * @param name - The file name (e.g., "receipt.jpg")
 * @param type - The MIME type (e.g., "image/jpeg")
 * @param size - The file size in bytes (default: 16KB)
 * @returns A File object backed by valid, renderable binary data
 *
 * @example
 * ```typescript
 * const imageFile = createStoryFile("receipt.jpg", "image/jpeg", 1024 * 100);
 * const pdfFile = createStoryFile("invoice.pdf", "application/pdf", 1024 * 500);
 * ```
 */
export function createStoryFile(name: string, type: string, size = 16_384): File {
	const content = createFileContent(type, size);
	const blob = new Blob([content], {type});
	const file = new File([blob], name, {type, lastModified: Date.now()});
	return file;
}

/**
 * Mock image file fixture (JPEG).
 */
export const storyImageFile: File = createStoryFile("grocery-receipt-2024-03-15.jpg", "image/jpeg", 1024 * 240);

/**
 * Mock PDF file fixture.
 */
export const storyPdfFile: File = createStoryFile("invoice-2024-03-15.pdf", "application/pdf", 1024 * 500);
