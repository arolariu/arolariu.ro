/**
 * @fileoverview Browser API mocks for Storybook-safe environments.
 * @module app/domains/invoices/_storybook/utils/browserMocks
 *
 * @remarks
 * Provides safe stubs for browser-only APIs that may be missing in Storybook SSR contexts:
 * - `navigator.clipboard.writeText` (toast-only feedback)
 * - `URL.createObjectURL` (returns synthetic blob URL)
 * - `URL.revokeObjectURL` (no-op)
 */

/**
 * Installs Storybook-safe browser API mocks.
 *
 * @remarks
 * Safe to call in both browser and Node contexts. If the global objects are missing,
 * the function returns early without modification. All mocks are non-destructive —
 * they only install stubs if the native API is already present.
 *
 * @example
 * ```tsx
 * // In .storybook/preview.tsx or story decorators
 * import {installStorybookBrowserMocks} from "@/app/domains/invoices/_storybook/utils/browserMocks";
 *
 * installStorybookBrowserMocks();
 * ```
 */
export function installStorybookBrowserMocks(): void {
	if (typeof globalThis === "undefined") {
		return;
	}

	// Mock navigator.clipboard for copy-to-clipboard operations
	if (typeof globalThis.navigator !== "undefined" && !globalThis.navigator.clipboard) {
		Object.defineProperty(globalThis.navigator, "clipboard", {
			value: {
				writeText: async (text: string): Promise<void> => {
					console.log("[Storybook Mock] Clipboard writeText:", text);
					return Promise.resolve();
				},
			},
			writable: true,
			configurable: true,
		});
	}

	// Mock URL.createObjectURL for scan preview generation
	if (typeof globalThis.URL !== "undefined" && !globalThis.URL.createObjectURL) {
		globalThis.URL.createObjectURL = (blob: Blob | MediaSource): string => {
			const synthetic = `blob:storybook/${Math.random().toString(36).slice(2)}`;
			console.log(`[Storybook Mock] URL.createObjectURL(${blob.constructor.name}):`, synthetic);
			return synthetic;
		};
	}

	// Mock URL.revokeObjectURL for cleanup safety
	if (typeof globalThis.URL !== "undefined" && !globalThis.URL.revokeObjectURL) {
		globalThis.URL.revokeObjectURL = (url: string): void => {
			console.log("[Storybook Mock] URL.revokeObjectURL:", url);
		};
	}
}
