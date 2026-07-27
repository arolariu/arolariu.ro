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
import {addInvoiceMetadata as addInvoiceMetadataServerSide} from "../../_actions/invoices";

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
      const result = await addInvoiceMetadataServerSide({invoiceId: invoice.id, entries: {[key]: value}});
      if (!result.success) {
        throw new Error(result.error.message);
      }
      addInvoiceMedataClientSide(invoice.id, {
        additionalMetadata: {
          ...invoice.additionalMetadata,
          [key]: value,
        },
      });

      return {
        ...invoice,
        additionalMetadata: {...invoice.additionalMetadata, [key]: value},
      };
    },
    [invoice, addInvoiceMedataClientSide],
  );

  /**
   * Sequentially processes metadata entries and records per-entry failures.
   *
   * @param entries - Metadata entries to process.
   * @returns Aggregate metadata add result after all entries have been attempted.
   */
  const processBulkEntries = useCallback(
    async (entries: readonly [string, string][]): Promise<BulkAddResult> => {
      const acc: {successCount: number; failureCount: number; failedItems: {key: string; value: string}[]} = {
        successCount: 0,
        failureCount: 0,
        failedItems: [],
      };

      for (const [key, value] of entries) {
        try {
          await performMutation(key, value);
          acc.successCount += 1;
        } catch (error) {
          console.error(`Failed to add metadata field [${key}: ${value}]:`, error);
          acc.failureCount += 1;
          acc.failedItems.push({key, value});
        }
      }

      return acc;
    },
    [performMutation],
  );

  async function addMetadataCallback(key: string, value: string): Promise<void>;
  async function addMetadataCallback(metadata: Record<string, string>): Promise<BulkAddResult>;
  async function addMetadataCallback(keyOrRecord: string | Record<string, string>, maybeValue?: string): Promise<void | BulkAddResult> {
    setIsAdding(true);
    try {
      if (typeof keyOrRecord === "string") {
        if (maybeValue === undefined) {
          throw new Error("Value must be specified for single metadata addition");
        }
        await performMutation(keyOrRecord, maybeValue);
      } else {
        const entries = Object.entries(keyOrRecord);
        return await processBulkEntries(entries);
      }
    } finally {
      setIsAdding(false);
    }
  }

  return {isAdding, addMetadataCallback};
}
