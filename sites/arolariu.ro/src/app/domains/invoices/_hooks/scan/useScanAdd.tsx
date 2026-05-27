"use client";

/**
 * @fileoverview Hook for adding a scan to an existing invoice.
* @module app/domains/invoices/_hooks/scan/useScanAdd
*
* @remarks
* Converts a browser `Blob` to a data URL, uploads it with the invoice scan
* server action, attaches the uploaded blob URL to an existing invoice, and
* exposes loading state plus toast feedback for the calling component.
 */

import type {InvoiceScanType} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {attachInvoiceScan} from "../../_actions/invoices/scans/attachInvoiceScan";
import {createInvoiceScan} from "../../_actions/invoices/scans/createInvoiceScan";

/**
 * Arguments required to upload and attach a scan.
 */
type ScanAddArgs = Readonly<{
  /** Browser blob selected by the user. */
  file: Blob;
  /** Original file name used for extension and metadata. */
  fileName: string;
  /** User identifier included in the generated blob path. */
  userIdentifier: string;
  /** Invoice scan type stored on the invoice attachment. */
  type: InvoiceScanType;
}>;

/**
 * Hook output type for scan attachment.
 */
type HookOutputType = Readonly<{
  /** Whether an upload or attach operation is in progress. */
  isAdding: boolean;
  /** Uploads the blob and attaches it to the target invoice. */
  addScanCallback: (args: ScanAddArgs) => Promise<void>;
}>;

/**
 * Reads a browser blob as a data URL.
 *
 * @param file - Blob to read with `FileReader`.
 * @returns A data URL string suitable for the `createInvoiceScan` server action.
 */
function readBlobAsDataUrl(file: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

/**
 * Manages uploading and attaching a new scan to an invoice.
 *
 * @remarks
 * The callback is intentionally two-step: first upload the scan to Azure Blob
 * Storage, then attach the returned blob URL to the invoice aggregate. Failures
 * are shown through toast notifications and rethrown so callers can perform
 * route-specific cleanup.
 *
 * @param invoiceId - The invoice identifier that receives the scan.
 * @returns Hook state with add progress and the scan add callback.
 *
 * @example
 * ```tsx
 * const {isAdding, addScanCallback} = useScanAdd(invoice.id);
 *
 * await addScanCallback({
 *   file,
 *   fileName: file.name,
 *   userIdentifier,
 *   type: InvoiceScanType.Photo,
 * });
 * ```
 */
export function useScanAdd(invoiceId: string): Readonly<HookOutputType> {
  const t = useTranslations();
  const [isAdding, setIsAdding] = useState(false);

  const addScanCallback = useCallback(
    async (args: ScanAddArgs): Promise<void> => {
      setIsAdding(true);
      try {
        const base64Data = await readBlobAsDataUrl(args.file);
        const ext = args.fileName.split(".").pop() || "jpg";
        const blobName = `${args.userIdentifier}/${invoiceId}/${crypto.randomUUID()}.${ext}`;
        const {success, data, error} = await createInvoiceScan({
          base64Data,
          blobName,
          metadata: {
            invoiceId,
            uploadedAt: new Date().toISOString(),
          },
        });

        if (!success || !data) {
          throw new Error(t((m) => m.toasts.invoices.useScanAdd.uploadFailed, {status: String(error?.status) || "unknown"}));
        }

        await attachInvoiceScan({
          invoiceId,
          payload: {
            type: args.type,
            location: data.blobUrl,
            additionalMetadata: {
              originalFileName: args.fileName,
              uploadedAt: new Date().toISOString(),
            },
          },
        });

        toast.success(t((m) => m.toasts.invoices.useScanAdd.addSuccess));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(t((m) => m.toasts.invoices.useScanAdd.addError), {description: message});
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    [invoiceId, t],
  );

  return {isAdding, addScanCallback};
}
