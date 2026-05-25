"use client";

/**
 * @fileoverview Hook for adding metadata to an invoice via patchInvoice.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceMetadataAdd
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
 * Hook output type.
 */
type HookOutputType = Readonly<{
  isAdding: boolean;
  addMetadataCallback: {
    (key: string, value: string): Promise<void>;
    (metadata: Record<string, string>): Promise<BulkAddResult>;
  };
}>;

/**
 * Manages adding metadata to the passed invoice.
 *
 * @param invoice - The invoice to modify or add metadata to
 * @returns State and callback for adding invoice metadata.
 */
export function useInvoiceMetadataAdd(invoice: Invoice): Readonly<HookOutputType> {
  const addInvoiceMedataClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Internal helper to atomically update metadata field for single key.
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
   * Sequential tail-recursive bulk processing helper.
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
