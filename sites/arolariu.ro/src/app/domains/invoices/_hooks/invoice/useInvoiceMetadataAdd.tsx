"use client";

/**
* @fileoverview Hook for adding metadata entries to an invoice.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceMetadataAdd
*
* @remarks
* Wraps the invoice metadata server action and updates the local invoice store
* after each successful call. The callback supports both a single key/value pair
* and a record of metadata entries processed sequentially.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useCallback, useState} from "react";
import { addInvoiceMetadata as addInvoiceMetadataServerSide } from "../../_actions/invoices";

/**
 * Result of a bulk metadata addition operation.
 *
 * @remarks
 * Returned by `performAdd` when called with a key-value record.
 */
type BulkAddResult = Readonly<{
  /** Number of metadata fields successfully updated on both server and client */
  successCount: number;
  /** Number of metadata fields that failed to update */
  failureCount: number;
  /** Detailed list of key-value pairs that failed to be added */
  failedItems: readonly {key: string; value: string}[];
}>;

/**
 * Hook output type for metadata addition.
 */
type HookOutputType = Readonly<{
  isAdding: boolean;
  addMetadataCallback: {
    (key: string, value: string): Promise<void>;
    (metadata: Record<string, string>): Promise<BulkAddResult>;
  };
}>;

/**
 * Manages adding metadata entries to the passed invoice.
 *
 * @param invoice - The invoice whose metadata should be extended.
 * @returns Hook state with mutation progress and the overloaded metadata add callback.
 *
 * @example
 * ```tsx
 * const {isAdding, addMetadataCallback} = useInvoiceMetadataAdd(invoice);
 *
 * await addMetadataCallback("receipt.category", "groceries");
 * ```
 *
 * @example
 * ```tsx
 * const result = await addMetadataCallback({
 *   "receipt.category": "groceries",
 *   "review.status": "approved",
 * });
 *
 * if (result.failureCount > 0) {
 *   console.warn("Metadata entries failed:", result.failedItems);
 * }
 * ```
 */
export function useInvoiceMetadataAdd(invoice: Invoice): Readonly<HookOutputType> {
  const addInvoiceMedataClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Adds one metadata field on the server and mirrors it in the invoice store.
   *
   * @param key - Metadata key to upsert.
   * @param value - Metadata value stored as a string.
   * @returns Updated invoice snapshot containing the merged metadata value.
   */
  const performMutation = useCallback(
    async (key: string, value: string): Promise<Invoice> => {
      await addInvoiceMetadataServerSide({invoiceId: invoice.id, entries: {[key]: value}});
      addInvoiceMedataClientSide(invoice.id, {
        additionalMetadata: {
          ...invoice.additionalMetadata,
          [key]: value,
        },
      });

      return {
        ...invoice,
        additionalMetadata: { ...invoice.additionalMetadata, [key]: value },
      };
    },
    [invoice, addInvoiceMedataClientSide],
  );

  /**
   * Sequentially processes metadata entries and records per-entry failures.
   *
   * @param entries - Metadata entries to process.
   * @param index - Current zero-based index in `entries`.
   * @param acc - Aggregated success, failure, and failed entry state.
   * @returns Aggregate metadata add result after all entries have been attempted.
   */
  const processBulkRecursive = useCallback(
    async (
      entries: readonly [string, string][],
      index: number,
      acc: {successCount: number; failureCount: number; failedItems: {key: string; value: string}[]},
    ): Promise<BulkAddResult> => {
      if (index >= entries.length) {
        return acc;
      }
      const entry = entries[index];
      if (!entry) {
        return acc;
      }
      const [key, value] = entry;
      try {
        await performMutation(key, value);
        return await processBulkRecursive(entries, index + 1, {
          ...acc,
          successCount: acc.successCount + 1,
        });
      } catch (error) {
        console.error(`Failed to add metadata field [${key}: ${value}]:`, error);
        return await processBulkRecursive(entries, index + 1, {
          ...acc,
          failureCount: acc.failureCount + 1,
          failedItems: [...acc.failedItems, {key, value}],
        });
      }
    },
    [performMutation],
  );

  const addMetadataCallback = useCallback(
    async (keyOrRecord: string | Record<string, string>, maybeValue?: string): Promise<any> => {
      setIsAdding(true);
      try {
        if (typeof keyOrRecord === "string") {
          if (maybeValue === undefined) {
            throw new Error("Value must be specified for single metadata addition");
          }
          await performMutation(keyOrRecord, maybeValue);
        } else {
          const entries = Object.entries(keyOrRecord);
          return await processBulkRecursive(entries, 0, {
            successCount: 0,
            failureCount: 0,
            failedItems: [],
          });
        }
      } finally {
        setIsAdding(false);
      }
    },
    [performMutation, processBulkRecursive],
  );

  return {isAdding, addMetadataCallback};
}
