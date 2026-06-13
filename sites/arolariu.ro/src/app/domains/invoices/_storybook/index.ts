/**
 * @fileoverview Invoice Storybook barrel export for fixtures, providers, stores, and utilities.
 * @module app/domains/invoices/_storybook
 *
 * @remarks
 * Central export point for all Storybook-specific test fixtures, providers,
 * stores, and utilities used in invoice domain stories.
 *
 * **Current Exports:**
 * - **Fixtures:** Merchant, Recipe, Scan, Invoice, Upload files
 * - **Providers:** InvoiceStoryFrame, WithInvoiceDialogs, WithEditInvoiceContext, WithViewInvoiceContext, WithScanUploadContext, OpenDialogOnMount
 * - **Stores:** resetInvoiceStoryStores, seedInvoiceStoryStores
 * - **Utils:** logStoryAction, successfulStoryAction, installStorybookBrowserMocks
 * - **Mocks:** Server action and hook mocks for invoices, scans, merchants
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

// Provider wrappers
export {WithInvoiceDialogs} from "./providers/DialogProviders";
export {WithEditInvoiceContext} from "./providers/EditInvoiceProviders";
export {WithViewInvoiceContext} from "./providers/ViewInvoiceProviders";
export {InvoiceStoryFrame, WithScanUploadContext} from "./providers/ScanUploadProviders";
export {WithCreateInvoiceContext} from "./providers/CreateInvoiceProviders";

// Dialog harness
export {OpenDialogOnMount} from "./providers/OpenDialogOnMount";

// Store helpers
export {resetInvoiceStoryStores, seedInvoiceStoryStores, type SeedInvoiceStoryStoresOptions} from "./stores/invoiceStoryStores";

// Action and browser utilities
export {logStoryAction, successfulStoryAction, type StoryActionResult} from "./utils/storyActions";
export {installStorybookBrowserMocks} from "./utils/browserMocks";

// Mock server actions
export * as mockInvoiceActions from "./mocks/actions/invoices";
export * as mockScanActions from "./mocks/actions/scans";
export * as mockMerchantActions from "./mocks/actions/merchants";

// Mock hooks
export * as mockInvoiceHooks from "./mocks/hooks/invoice";
export * as mockScanHooks from "./mocks/hooks/scan";

// Focused entrypoints (re-exported for backward-compatible barrel access)
export * from "./fixtures";
export * from "./providers";
export * from "./stores";
export * from "./test-utils";
export {getInvoiceStorybookAliases, getInvoiceStorybookResolverPlugins} from "./domainAliases";
