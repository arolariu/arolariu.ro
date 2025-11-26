/**
 * @fileoverview Custom React hooks for the arolariu.ro application.
 * @module hooks
 *
 * @remarks
 * This module exports all custom hooks used throughout the application:
 *
 * **Data Fetching Hooks:**
 * - {@link useInvoice} - Fetches a single invoice by identifier
 * - {@link useInvoices} - Fetches all invoices for the current user
 * - {@link useMerchant} - Fetches a single merchant by identifier
 * - {@link useMerchants} - Fetches all merchants for the current user
 * - {@link useUserInformation} - Fetches current user information with JWT
 *
 * **Utility Hooks:**
 * - {@link usePaginationWithSearch} - Provides pagination with search filtering
 *
 * **Important Notes:**
 * - All data fetching hooks are client-side only (require "use client" directive)
 * - Hooks manage loading and error states internally
 * - Invoice and merchant hooks integrate with Zustand stores for caching
 */

export {useInvoice} from "./useInvoice";
export {useInvoices} from "./useInvoices";
export {useMerchant} from "./useMerchant";
export {useMerchants} from "./useMerchants";

export {usePaginationWithSearch} from "./usePagination";
export {useUserInformation} from "./useUserInformation";
