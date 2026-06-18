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
 * - **Providers:** InvoiceStoryFrame, WithInvoiceDialogs, WithEditInvoiceContext, WithViewInvoiceContext, WithScanUploadContext, OpenDialogButton
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
  storyImageScanUrlSecondary,
  storyImageScanUrlWide,
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

// Edge-case fixtures (empty / huge / long-text)
export {
  storyEmptyInvoice,
  storyHugeInvoice,
  storyLongNameInvoice,
  storyLongNameMerchant,
  storyManyInvoices,
} from "./fixtures/edgeCaseFixtures";

// Data/state scenario fixtures (currency, amounts, confidence, sharing, dates)
export {
  PUBLIC_SHARE_GUID,
  storyDeletedInvoice,
  storyEpochDateInvoice,
  storyEurInvoice,
  storyFutureDatedInvoice,
  storyGbpInvoice,
  storyLargeTotalInvoice,
  storyLowConfidenceInvoice,
  storyManyAllergensInvoice,
  storyManyUpdatesInvoice,
  storyMinimalMerchant,
  storyMixedConfidenceInvoice,
  storySharedManyInvoice,
  storySoftDeletedItemsInvoice,
  storyTipInvoice,
  storyUsdInvoice,
  storyZeroPriceItemsInvoice,
  storyZeroTotalInvoice,
} from "./fixtures/dataStateFixtures";

// Upload file utilities
export {createStoryFile, storyImageFile, storyPdfFile} from "./fixtures/uploadFixtures";

// Provider wrappers
export {WithCreateInvoiceContext} from "./providers/CreateInvoiceProviders";
export {WithInvoiceDialogs} from "./providers/DialogProviders";
export {WithEditInvoiceContext} from "./providers/EditInvoiceProviders";
export {InvoiceStoryFrame, WithScanUploadContext} from "./providers/ScanUploadProviders";
export {WithViewInvoiceContext} from "./providers/ViewInvoiceProviders";

// Dialog harness
export {OpenDialogButton} from "./providers/OpenDialogButton";

// Store helpers
export {resetInvoiceStoryStores, seedInvoiceStoryStores, type SeedInvoiceStoryStoresOptions} from "./stores/invoiceStoryStores";
export {resetPreferencesStore, seedPreferencesStore, type SeedPreferencesStoreOptions} from "./stores/preferencesStoryStore";

// Action and browser utilities
export {installStorybookBrowserMocks} from "./utils/browserMocks";
export {logStoryAction, successfulStoryAction, type StoryActionResult} from "./utils/storyActions";

// Mock server actions
export * as mockInvoiceActions from "./mocks/actions/invoices";
export * as mockMerchantActions from "./mocks/actions/merchants";
export * as mockScanActions from "./mocks/actions/scans";

// Mock hooks
export * as mockInvoiceHooks from "./mocks/hooks/invoice";
export * as mockScanHooks from "./mocks/hooks/scan";

// Focused entrypoints (re-exported for backward-compatible barrel access)
export * from "./fixtures";
export * from "./providers";
export * from "./stores";
export * from "./test-utils";

// Story controls
export {invoicePresets, merchantPresets, recipePresets, scanPresets} from "./controls/entityPresets";
export {withAuthState} from "./controls/withAuthState";
export {withEntityPreset} from "./controls/withEntityPreset";
