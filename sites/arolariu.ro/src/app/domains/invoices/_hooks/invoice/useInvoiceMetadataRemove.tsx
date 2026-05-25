"use client";

/**
 * @fileoverview Hook for removing metadata from an invoice.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceMetadataRemove
 */

import { useInvoicesStore } from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useCallback, useState} from "react";
import { deleteInvoiceMetadata as deleteInvoiceMetadataServerSide } from "../../_actions/invoices";

/**
 * Result of a bulk metadata removal operation.
 *
 * @remarks
 * Returned by `performRemove` when called with an array of keys.
 */
export type BulkRemoveResult = Readonly<{
  /** Number of metadata fields successfully removed */
  successCount: number;
  /** Number of metadata fields that failed to be removed */
  failureCount: number;
  /** List of keys that failed deletion */
  failedKeys: readonly string[];
}>;

/**
 * Hook output type.
 */
type HookOutputType = Readonly<{
  isRemoving: boolean;
  removeMetadataCallback: {
    (key: string): Promise<void>;
    (keys: readonly string[]): Promise<BulkRemoveResult>;
  };
}>;

/**
 * Manages removing metadata from the passed invoice.
 *
 * @param invoice - The target invoice to remove keys from
 * @returns State and callback for removing invoice metadata.
 */
export function useInvoiceMetadataRemove(invoice: Invoice): Readonly<HookOutputType> {
  const deleteInvoiceMedataClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  /**
   * Internal worker function to delete metadata key for a single field on the server.
   */
  const performMutation = useCallback(
    async (key: string): Promise<void> => {
      await deleteInvoiceMetadataServerSide({invoiceId: invoice.id, key});
      deleteInvoiceMedataClientSide(invoice.id, {
        additionalMetadata: {
          ...invoice.additionalMetadata,
          [key]: undefined!,
        },
      });
    },
    [invoice.id, deleteInvoiceMedataClientSide],
  );

  /**
   * Sequential tail-recursive bulk processing helper.
   */
  const processBulkRecursive = useCallback(
    async (
      keys: readonly string[],
      index: number,
      acc: {successCount: number; failureCount: number; failedKeys: string[]},
    ): Promise<BulkRemoveResult> => {
      if (index >= keys.length) {
        return acc;
      }
      const key = keys[index];
      if (!key) {
        return acc;
      }
      try {
        await performMutation(key);
        return await processBulkRecursive(keys, index + 1, {
          ...acc,
          successCount: acc.successCount + 1,
        });
      } catch (error) {
        console.error(`Failed to remove metadata field [${key}]:`, error);
        return await processBulkRecursive(keys, index + 1, {
          ...acc,
          failureCount: acc.failureCount + 1,
          failedKeys: [...acc.failedKeys, key],
        });
      }
    },
    [performMutation],
  );

  const removeMetadataCallback = useCallback(
    async (keyOrKeys: string | readonly string[]): Promise<any> => {
      setIsRemoving(true);
      try {
        if (typeof keyOrKeys === "string") {
          await performMutation(keyOrKeys);
        } else {
          return await processBulkRecursive(keyOrKeys, 0, {
            successCount: 0,
            failureCount: 0,
            failedKeys: [],
          });
        }
      } finally {
        setIsRemoving(false);
      }
    },
    [performMutation, processBulkRecursive],
  );

  return {isRemoving, removeMetadataCallback};
}
