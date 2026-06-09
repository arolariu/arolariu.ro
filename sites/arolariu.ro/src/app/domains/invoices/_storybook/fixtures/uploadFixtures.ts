/**
 * @fileoverview Upload file fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/uploadFixtures
 */

/**
 * Creates a mock File object for testing file uploads.
 *
 * @param name - The file name (e.g., "receipt.jpg")
 * @param type - The MIME type (e.g., "image/jpeg")
 * @param size - The file size in bytes (default: 16KB)
 * @returns A File object with mock binary data
 *
 * @example
 * ```typescript
 * const imageFile = createStoryFile("receipt.jpg", "image/jpeg", 1024 * 100);
 * const pdfFile = createStoryFile("invoice.pdf", "application/pdf", 1024 * 500);
 * ```
 */
export function createStoryFile(name: string, type: string, size = 16_384): File {
	// Create a Uint8Array filled with zeros to simulate binary data
	const buffer = new Uint8Array(size);
	const blob = new Blob([buffer], {type});
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
