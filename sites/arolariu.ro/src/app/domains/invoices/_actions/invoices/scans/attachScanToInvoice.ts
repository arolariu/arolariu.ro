"use server";

/**
 * @fileoverview Strict server action for attaching a supported invoice scan.
 * @module app/domains/invoices/_actions/invoices/scans/attachScanToInvoice
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {getStorageAccountName, isApprovedInvoiceScanLocation} from "@/lib/azure/storageLocationPolicy";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {InvoiceScanType, type CreateInvoiceScanDtoPayload} from "@/types/invoices";
import {isHeicScanFileName} from "../../../_utils/mimeTypeUtilities";

type AttachScanInput = Readonly<{readonly invoiceId: string; readonly payload: CreateInvoiceScanDtoPayload}>;
type MetadataValue = string | number | boolean | null;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedScanType(value: unknown): value is InvoiceScanType {
  return (
    value === InvoiceScanType.JPG
    || value === InvoiceScanType.JPEG
    || value === InvoiceScanType.PNG
    || value === InvoiceScanType.PDF
    || value === InvoiceScanType.BMP
    || value === InvoiceScanType.TIFF
    || value === InvoiceScanType.HEIF
  );
}

function isMetadata(value: unknown): value is Readonly<Record<string, MetadataValue>> {
  return (
    isRecord(value)
    && Object.entries(value).every(
      ([key, entry]) =>
        key.trim() !== "" && (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null),
    )
  );
}

function isAttachScanInput(value: unknown): value is AttachScanInput {
  return (
    isRecord(value)
    && Object.keys(value).length === 2
    && typeof value["invoiceId"] === "string"
    && isRecord(value["payload"])
    && Object.keys(value["payload"]).length === 3
    && isSupportedScanType(value["payload"]["type"])
    && typeof value["payload"]["location"] === "string"
    && isMetadata(value["payload"]["metadata"])
  );
}

function hasApprovedScanLocation(input: AttachScanInput, storageServiceRoot: string): boolean {
  const storageAccountName = getStorageAccountName(storageServiceRoot);
  try {
    return (
      storageAccountName !== null
      && !isHeicScanFileName(new URL(input.payload.location).pathname)
      && isApprovedInvoiceScanLocation({
        location: input.payload.location,
        storageServiceRoot,
        storageAccountName,
      })
    );
  } catch {
    return false;
  }
}

/**
 * Attaches a supported scan without forwarding response content or raw errors.
 *
 * @param input - Untrusted invoice identifier and exact scan DTO.
 * @returns A safe attachment result.
 */
export async function attachScanToInvoice(input: unknown): ServerActionResult<void> {
  return withSpan("api.actions.invoices.attachScanToInvoice", async () => {
    if (!isAttachScanInput(input)) {
      return {
        success: false,
        error: {code: "VALIDATION_ERROR", message: "This scan format is not supported. Convert HEIC images to HEIF before attaching."},
      };
    }

    try {
      validateStringIsGuidType(input.invoiceId, "invoiceId");
      const storageServiceRoot = await fetchConfigurationValue("Endpoints:Storage:Blob");
      if (!hasApprovedScanLocation(input, storageServiceRoot)) {
        addSpanEvent("bff.invoice.scan.attach.rejected", {errorCode: "VALIDATION_ERROR"});
        logWithTrace("warn", "invoice.scan.attach.rejected", {errorCode: "VALIDATION_ERROR"}, "server");
        return {
          success: false,
          error: {code: "VALIDATION_ERROR", message: "This scan format is not supported. Convert HEIC images to HEIF before attaching."},
        };
      }
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${input.invoiceId}/scans`, {
        method: "POST",
        headers: {Authorization: `Bearer ${authToken}`, "Content-Type": "application/json"},
        body: JSON.stringify(input.payload),
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.invoice.scan.attach.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "invoice.scan.attach.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: "Unable to attach the scan. Please try again.", status: response.status}};
      }

      addSpanEvent("bff.invoice.scan.attach.complete");
      logWithTrace("info", "invoice.scan.attach.complete", undefined, "server");
      return {success: true, data: undefined};
    } catch (error) {
      addSpanEvent("bff.invoice.scan.attach.failed");
      logWithTrace("error", "invoice.scan.attach.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to attach the scan. Please try again.");
    }
  });
}
