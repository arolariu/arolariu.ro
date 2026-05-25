"use client";

/**
 * @fileoverview Hook for adding a scan to an existing invoice.
 * @module app/domains/invoices/_hooks/useScanAdd
 */

import type {InvoiceScanType} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import { attachInvoiceScan, createInvoiceScan } from "../../_actions/invoices";

type ScanAddArgs = Readonly<{
  file: Blob;
  fileName: string;
  userIdentifier: string;
  type: InvoiceScanType;
}>;

type HookOutputType = Readonly<{
  isAdding: boolean;
  performAdd: (args: ScanAddArgs) => Promise<void>;
}>;

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
 * @param invoiceId - The invoice identifier that receives the scan.
 * @returns State and callback for adding a scan.
 * @throws {Error} When upload or attach fails.
 */
export function useScanAdd(invoiceId: string): Readonly<HookOutputType> {
  const t = useTranslations("IMS--Hooks.useScanAdd");
  const [isAdding, setIsAdding] = useState(false);

  const performAdd = useCallback(
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
          throw new Error(t("uploadFailed", {status: String(error?.status) || "unknown"}));
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

        toast.success(t("addSuccess"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(t("addError"), {description: message});
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    [invoiceId, t],
  );

  return {isAdding, performAdd};
}
