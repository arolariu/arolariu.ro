"use client";

/**
 * @fileoverview Hook for removing metadata from an invoice.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceMetadataRemove
*
* @remarks
* Wraps the invoice metadata delete server action and mirrors removals in the
* local invoice store. The callback supports a single key or an array of keys
* processed sequentially.
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
 * Hook output type for metadata removal.
 */
type HookOutputType = Readonly<{
  isRemoving: boolean;
  removeMetadataCallback: {
    (key: string): Promise<void>;
    (keys: readonly string[]): Promise<BulkRemoveResult>;
  };
}>;

/**
 * Manages removing metadata keys from the passed invoice.
 *
 * @param invoice - The target invoice to remove metadata keys from.
 * @returns Hook state with mutation progress and the overloaded metadata remove callback.
 *
 * @example
 * ```tsx
 * const {isRemoving, removeMetadataCallback} = useInvoiceMetadataRemove(invoice);
 *
 * await removeMetadataCallback("receipt.category");
 * ```
 *
 * @example
 * ```tsx
 * const result = await removeMetadataCallback(["receipt.category", "review.status"]);
 *
 * if (result.failureCount > 0) {
 *   console.warn("Metadata keys failed:", result.failedKeys);
 * }
 * ```
 */
export function useInvoiceMetadataRemove(invoice: Invoice): Readonly<HookOutputType> {
  const deleteInvoiceMedataClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  /**
   * Removes one metadata key on the server and mirrors it in the invoice store.
   *
   * @param key - Metadata key to remove.
   * @returns A promise that resolves after the server action and store update complete.
   */
  const performMutation = useCallback(
    async (key: string): Promise<void> => {
      const result = await deleteInvoiceMetadataServerSide({invoiceId: invoice.id, key});
      if (!result.success) {
        throw new Error(result.error.message);
      }
      deleteInvoiceMedataClientSide(invoice.id, {
        additionalMetadata: {
          ...invoice.additionalMetadata,
          [key]: undefined!,
        },
      });
    },
    [invoice.id, invoice.additionalMetadata, deleteInvoiceMedataClientSide],
  );

  /**
   * Sequentially processes metadata keys and records per-key failures.
   *
   * @param keys - Metadata keys to remove.
   * @param index - Current zero-based index in `keys`.
   * @param acc - Aggregated success, failure, and failed key state.
   * @returns Aggregate metadata removal result after all keys have been attempted.
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

  async function removeMetadataCallback(key: string): Promise<void>;
  async function removeMetadataCallback(keys: readonly string[]): Promise<BulkRemoveResult>;
  async function removeMetadataCallback(keyOrKeys: string | readonly string[]): Promise<void | BulkRemoveResult> {
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
  }

  return {isRemoving, removeMetadataCallback};
}
