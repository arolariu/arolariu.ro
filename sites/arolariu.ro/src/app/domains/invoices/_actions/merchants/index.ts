/**
 * @fileoverview Server actions for merchant data management in the invoices domain.
 * @module app/domains/invoices/_actions/merchants
 *
 * @remarks
 * This module provides read-only server actions for fetching merchant information.
 * All operations require JWT authentication and execute server-side only.
 *
 * **Exported Actions:**
 * - {@link fetchMerchant} - Fetch a single merchant by ID
 * - {@link fetchMerchants} - Fetch all merchants for the authenticated user
 * - {@link analyzeMerchant} - Enqueue asynchronous merchant analysis
 *
 * **Shared Characteristics:**
 * - **Authentication**: All actions require valid JWT token via `fetchBFFUserFromAuthService`
 * - **Validation**: GUID validation via `validateStringIsGuidType` for merchant IDs
 * - **Error Handling**: Returns `ServerActionResult` wrapper with user-friendly messages
 * - **HTTP Methods**: All operations use GET (read-only)
 * - **Cache Strategy**: No cache revalidation (read operations don't mutate data)
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
export {analyzeMerchant} from "./analyzeMerchant";
export {fetchMerchant} from "./fetchMerchant";
export {fetchMerchants} from "./fetchMerchants";
// #endregion
