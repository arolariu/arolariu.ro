/**
 * @fileoverview Barrel export for merchant-focused invoice domain hooks.
 * @module app/domains/invoices/_hooks/merchant
 *
 * @remarks
 * Provides the public import surface for merchant lookup hooks. These hooks
 * hydrate from the merchants Zustand store and revalidate through merchant
 * server actions.
 *
 * @example
 * ```tsx
 * import {useMerchant, useMerchants} from "@/app/domains/invoices/_hooks/merchant";
 *
 * const {merchant} = useMerchant({merchantIdentifier: merchantId});
 * const {merchants} = useMerchants();
 * ```
 *
 * @see {@link useMerchant} - Fetches one merchant with store hydration.
 * @see {@link useMerchants} - Fetches merchant collections with store hydration.
 */

// #region Hooks for Merchant queries (fetch single/multiple)
export { useMerchant } from "./useMerchant";
export { useMerchants } from "./useMerchants";
// #endregion
