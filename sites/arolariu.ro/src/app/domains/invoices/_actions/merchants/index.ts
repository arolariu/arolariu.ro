/**
 * @fileoverview Server actions for merchant data management in the invoices domain.
 * @module app/domains/invoices/_actions/merchants
 *
 * @remarks
 * This module provides server actions for fetching and updating merchant information.
 * All operations require JWT authentication and execute server-side only.
 *
 * **Exported Actions:**
 * - {@link fetchMerchant} - Fetch a single merchant by ID
 * - {@link fetchMerchants} - Fetch all merchants for the authenticated user
 * - {@link updateMerchant} - Update client-editable merchant fields
 *
 * **Shared Characteristics:**
 * - **Authentication**: All actions require valid JWT token via `fetchBFFUserFromAuthService`
 * - **Validation**: GUID validation via `validateStringIsGuidType` for merchant IDs
 * - **Error Handling**: Returns `ServerActionResult` wrapper with user-friendly messages
 * - **OpenTelemetry**: All operations emit spans and events for observability
 */

// #region Merchant server-side queries (fetch single/multiple)
export {fetchMerchant} from "./fetchMerchant";
export {fetchMerchants} from "./fetchMerchants";
// #endregion

// #region Merchant server-side mutations (update)
export {updateMerchant} from "./updateMerchant";
// #endregion
