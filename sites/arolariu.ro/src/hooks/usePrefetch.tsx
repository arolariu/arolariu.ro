/**
 * @fileoverview Hook for prefetching invoice data on hover.
 * @module @/hooks/usePrefetch
 */

"use client";

import {useRouter} from "next/navigation";
import {useCallback} from "react";

/**
 * Return type for the usePrefetch hook.
 */
type UsePrefetchReturn = {
  /** Prefetch invoice data for a given invoice ID */
  prefetchInvoice: (invoiceId: string) => void;
  /** Returns a hover handler that prefetches invoice data */
  onHoverStart: (invoiceId: string) => () => void;
};

/**
 * Hook for prefetching invoice data when a user hovers over an invoice card.
 * Uses Next.js router.prefetch to load the page in the background.
 *
 * @returns Object with prefetch functions
 *
 * @example
 * ```tsx
 * const {onHoverStart} = usePrefetch();
 *
 * <div onMouseEnter={onHoverStart("invoice-123")}>
 *   Invoice Card
 * </div>
 * ```
 */
export function usePrefetch(): UsePrefetchReturn {
  const router = useRouter();

  /**
   * Prefetch an invoice page by ID.
   *
   * @param invoiceId - The invoice identifier to prefetch
   */
  const prefetchInvoice = useCallback(
    (invoiceId: string) => {
      router.prefetch(`/domains/invoices/view-invoice/${invoiceId}`);
    },
    [router],
  );

  /**
   * Create a hover handler that prefetches invoice data.
   *
   * @param invoiceId - The invoice identifier to prefetch
   * @returns Hover event handler
   */
  const onHoverStart = useCallback(
    (invoiceId: string) => {
      return () => prefetchInvoice(invoiceId);
    },
    [prefetchInvoice],
  );

  return {prefetchInvoice, onHoverStart};
}
