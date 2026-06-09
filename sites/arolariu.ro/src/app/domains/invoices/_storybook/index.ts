/**
 * @fileoverview Invoice Storybook barrel export for fixtures and utilities.
 * @module app/domains/invoices/_storybook
 *
 * @remarks
 * Central export point for all Storybook-specific test fixtures, providers,
 * stores, and utilities used in invoice domain stories.
 *
 * **Current Exports:**
 * - Merchant fixtures (local shop, online shop, supermarket, hypermarket)
 * - Recipe fixtures (easy, normal, hard complexity)
 * - Scan fixtures (image, PDF, cached variants)
 * - Invoice fixtures (grocery, public, online)
 * - Upload file utilities
 *
 * **Future Exports (Planned):**
 * - Mock providers (React Context providers for stories)
 * - Mock stores (Zustand store instances with test data)
 * - Test utilities (helper functions for story setup)
 */

// Merchant fixtures
export {storyMerchant, storyMerchants, storyOnlineMerchant} from "./fixtures/merchantFixtures";

// Recipe fixtures
export {storyRecipeEasy, storyRecipeHard, storyRecipes} from "./fixtures/recipeFixtures";

// Scan fixtures
export {
	storyCachedImageScan,
	storyCachedPdfScan,
	storyImageScanUrl,
	storyInvoiceImageScan,
	storyInvoicePdfScan,
	storyPdfScanUrl,
} from "./fixtures/scanFixtures";

// Invoice fixtures
export {
	storyCurrency,
	storyInvoice,
	storyInvoices,
	storyOnlineInvoice,
	storyPaymentInformation,
	storyProducts,
	storyPublicInvoice,
} from "./fixtures/invoiceFixtures";

// Upload file utilities
export {createStoryFile, storyImageFile, storyPdfFile} from "./fixtures/uploadFixtures";
