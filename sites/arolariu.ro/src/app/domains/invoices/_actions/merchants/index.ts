/**
 * @fileoverview Server actions for merchant data management in the invoices domain.
 * @module app/domains/invoices/_actions/merchants
 *
 * @remarks
 * This module provides authenticated merchant retrieval actions and a durable
 * analysis enqueue action. All operations execute server-side only.
 *
 * **Exported Actions:**
 * - {@link fetchMerchant} - Fetch a single merchant by ID
 * - {@link fetchMerchants} - Fetch all merchants for the authenticated user
 * - {@link analyzeMerchant} - Enqueue asynchronous merchant analysis
 * - {@link updateMerchant} - Replace a merchant and its manual NACE selection
 *
 * **Shared Characteristics:**
 * - **Authentication**: All actions require valid JWT token via `fetchBFFUserFromAuthService`
 * - **Validation**: GUID validation via `validateStringIsGuidType` for merchant IDs
 * - **Error Handling**: Returns `ServerActionResult` wrapper with user-friendly messages
 * - **HTTP Methods**: Retrieval uses GET; `analyzeMerchant` uses POST to enqueue work
 * - **Cache Strategy**: Retrieval does not revalidate; enqueue acceptance does not wait for analysis completion
 * - **OpenTelemetry**: All operations emit spans and events for observability
 *
 * **Data Access Patterns:**
 * - Merchants are shared across users (same merchant ID for all)
 * - Statistics (totalSpent, invoiceCount) are user-specific
 * - Access control enforced via JWT claims
 * - AI-enriched data includes logos, categories, contact information
 *
 * **Usage Context:**
 * Use these actions for:
 * - Displaying merchant details in invoice views
 * - Populating merchant dropdowns/selectors
 * - Building merchant analytics dashboards
 * - Showing merchant statistics (spending, invoice count)
 *
 * @example
 * ```typescript
 * // Fetch all merchants for dropdown
 * import { fetchMerchants } from "@/app/domains/invoices/_actions/merchants";
 *
 * const result = await fetchMerchants();
 * if (result.success) {
 *   const options = result.data.map((m) => ({
 *     value: m.id,
 *     label: m.name,
 *   }));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Fetch specific merchant for detail view
 * import { fetchMerchant } from "@/app/domains/invoices/_actions/merchants";
 *
 * const result = await fetchMerchant({ merchantId });
 * if (result.success) {
 *   console.log(result.data.name, result.data.totalSpent);
 * }
 * ```
 *
 * @see {@link fetchMerchant} - Single merchant fetch operation
 * @see {@link fetchMerchants} - Batch merchant fetch operation
 */

// #region Merchant server-side queries (fetch single/multiple)
export {fetchMerchant} from "./fetchMerchant";
export {fetchMerchants} from "./fetchMerchants";
// #endregion

// #region Merchant server-side mutations and analysis
export {analyzeMerchant} from "./analyzeMerchant";
export {updateMerchant} from "./updateMerchant";
// #endregion
