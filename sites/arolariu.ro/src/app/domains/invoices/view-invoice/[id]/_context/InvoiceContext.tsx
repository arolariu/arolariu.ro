/**
 * @fileoverview Invoice context for the view-invoice domain.
 * @module domains/invoices/view-invoice/[id]/context/InvoiceContext
 *
 * @remarks
 * Provides invoice and merchant data throughout the view-invoice component tree:
 * - Eliminates prop drilling for invoice and merchant objects
 * - Type-safe context access via custom hook
 * - Server-fetched data passed from page.tsx to island.tsx
 *
 * **Rendering Context**: Client Component (context provider pattern).
 *
 * @see {@link useInvoiceContext} for consuming the context
 */

"use client";

import type {Invoice, Merchant} from "@/types/invoices";
import {createContext, use, useMemo} from "react";

/**
 * Context value shape for invoice and merchant data access.
 *
 * @remarks
 * **Properties:**
 * - `invoice`: The current invoice being viewed
 * - `merchant`: The merchant associated with the invoice
 *
 * **Type Safety:** Ensures consistent invoice data access across all consuming components.
 *
 * @example
 * ```typescript
 * const { invoice, merchant } = useInvoiceContext();
 * ```
 */
interface InvoiceContextValue {
  /** The current invoice being viewed */
  readonly invoice: Invoice;
  /** The merchant associated with the invoice */
  readonly merchant: Merchant;
}

const InvoiceContext = createContext<InvoiceContextValue | undefined>(undefined);

/**
 * Props for the InvoiceContextProvider component.
 *
 * @remarks
 * Both invoice and merchant are required and passed from the server component (page.tsx).
 */
interface InvoiceContextProviderProps {
  readonly invoice: Invoice;
  readonly merchant: Merchant;
  readonly children: React.ReactNode;
}

/**
 * Client Component providing invoice and merchant data to the view-invoice component tree.
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive required).
 *
 * **Why Client Component?**
 * - React Context API requires client-side execution
 * - Used within the island.tsx client boundary
 *
 * **Data Flow:**
 * - page.tsx (Server Component) fetches invoice and merchant
 * - island.tsx wraps children with InvoiceContextProvider
 * - Child components consume data via useInvoiceContext hook
 *
 * **Performance:**
 * - Memoized context value prevents unnecessary re-renders
 * - Invoice and merchant are stable (server-fetched, immutable)
 *
 * @param props - Component props
 * @param props.invoice - The invoice data fetched from the server
 * @param props.merchant - The merchant data fetched from the server
 * @param props.children - Child components to receive invoice context
 * @returns Provider component wrapping children with invoice context
 *
 * @example
 * ```tsx
 * // In island.tsx
 * <InvoiceContextProvider invoice={invoice} merchant={merchant}>
 *   <InvoiceDetailsCard />
 *   <MerchantInfoCard />
 * </InvoiceContextProvider>
 * ```
 *
 * @see {@link useInvoiceContext} for consuming the context
 */
export function InvoiceContextProvider({invoice, merchant, children}: Readonly<InvoiceContextProviderProps>): React.JSX.Element {
  /**
   * Memoized context value to prevent unnecessary consumer re-renders.
   *
   * @remarks
   * **Performance:** Only recomputes when invoice or merchant references change.
   * Since these are server-fetched and passed as props, they should be stable
   * for the lifetime of the component.
   *
   * **Contents:**
   * - `invoice`: The current Invoice object
   * - `merchant`: The associated Merchant object
   */
  const value = useMemo(
    () => ({
      invoice,
      merchant,
    }),
    [invoice, merchant],
  );

  return <InvoiceContext value={value}>{children}</InvoiceContext>;
}

/**
 * Custom hook to consume invoice context with type-safe access.
 *
 * @remarks
 * **Usage Requirements:** Must be called within an InvoiceContextProvider tree.
 *
 * **Why Client Component?** This hook uses React 19's `use()` API which requires
 * client-side execution.
 *
 * **Error Handling:** Throws descriptive error if provider is missing, aiding debugging.
 *
 * **Return Value:**
 * - `invoice`: The current invoice being viewed
 * - `merchant`: The merchant associated with the invoice
 *
 * @returns Current invoice context value with invoice and merchant objects
 *
 * @throws {Error} When used outside InvoiceContextProvider (context is undefined)
 *
 * @example
 * ```tsx
 * "use client";
 *
 * function InvoiceSummary() {
 *   const { invoice, merchant } = useInvoiceContext();
 *
 *   return (
 *     <div>
 *       <h1>{invoice.name}</h1>
 *       <p>From: {merchant.name}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Access only invoice
 * function InvoiceTotal() {
 *   const { invoice } = useInvoiceContext();
 *   return <span>{invoice.paymentInformation.totalAmount}</span>;
 * }
 * ```
 */
export function useInvoiceContext(): InvoiceContextValue {
  const context = use(InvoiceContext);
  if (context === undefined) {
    throw new Error("useInvoiceContext must be used within an InvoiceContextProvider");
  }

  return context;
}
