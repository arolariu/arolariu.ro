"use server";

/**
 * @fileoverview Server action for full merchant updates with manual NACE selections.
 * @module app/domains/invoices/_actions/merchants/updateMerchant
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import {isClassificationSelection, type ClassificationSelection} from "@/types/invoices";
import {parseMerchantTransport} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

interface MerchantAddress {
  readonly fullName: string;
  readonly address: string;
  readonly phoneNumber: string;
  readonly emailAddress: string;
  readonly website: string;
}

interface MerchantUpdatePayload {
  readonly name: string;
  readonly description: string;
  readonly classification: ClassificationSelection | null;
  readonly address: MerchantAddress;
  readonly parentCompanyId: string | null;
  readonly additionalMetadata: Readonly<Record<string, string>>;
}

interface ServerActionInputType {
  readonly merchantId: string;
  readonly payload: MerchantUpdatePayload;
}

type ServerActionOutputType = ServerActionResult<Readonly<import("@/types/invoices").Merchant>>;

// .NET ContactInformation stores ordinary strings. This is its runtime String.Length ceiling.
const MAXIMUM_CONTACT_FIELD_LENGTH = 2_147_483_647;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isContactString(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAXIMUM_CONTACT_FIELD_LENGTH;
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, allowedKeys: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
}

function isMerchantAddress(value: unknown): value is MerchantAddress {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["fullName", "address", "phoneNumber", "emailAddress", "website"])
    && isContactString(value["fullName"])
    && isContactString(value["address"])
    && isContactString(value["phoneNumber"])
    && isContactString(value["emailAddress"])
    && isContactString(value["website"])
  );
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isMerchantUpdatePayload(value: unknown): value is MerchantUpdatePayload {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["name", "description", "classification", "address", "parentCompanyId", "additionalMetadata"])
    && isNonBlankString(value["name"])
    && isNonBlankString(value["description"])
    && (value["classification"] === null || isClassificationSelection(value["classification"]))
    && isMerchantAddress(value["address"])
    && (value["parentCompanyId"] === null || isNonBlankString(value["parentCompanyId"]))
    && isStringRecord(value["additionalMetadata"])
  );
}

function isUpdateMerchantInput(value: unknown): value is ServerActionInputType {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["merchantId", "payload"])
    && isNonBlankString(value["merchantId"])
    && isMerchantUpdatePayload(value["payload"])
  );
}

/**
 * Replaces a merchant while optionally recording a manual NACE 2.1 selection.
 *
 * @remarks
 * The backend endpoint uses PUT, so callers provide the complete mutable merchant
 * payload. A null classification intentionally clears a prior manual selection.
 * This action validates both untrusted input and successful JSON responses before
 * returning a result, and it never logs merchant payload values.
 *
 * @param input - Untrusted input containing the merchant identifier and replacement payload.
 * @returns A validated merchant response or a safe server-action error result.
 */
export async function updateMerchant(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.invoices.updateMerchant", async () => {
    try {
      if (!isUpdateMerchantInput(input)) {
        addSpanEvent("bff.request.update-merchant.validation-error");
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Merchant update request is invalid.",
          },
        };
      }

      const {merchantId, payload} = input;
      validateStringIsGuidType(merchantId, "merchantId");
      if (payload.parentCompanyId !== null) {
        validateStringIsGuidType(payload.parentCompanyId, "parentCompanyId");
      }

      addSpanEvent("bff.user.jwt.fetch.start");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      addSpanEvent("bff.request.update-merchant.start");
      const response = await fetchWithTimeout(`/rest/v1/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.update-merchant.complete");

      if (!response.ok) {
        addSpanEvent("bff.request.update-merchant.error", {"http.response.status_code": response.status});
        return {
          success: false,
          error: {
            code: response.status >= 500 ? "SERVER_ERROR" : "VALIDATION_ERROR",
            message: "Unable to update the merchant. Please review the details and try again.",
            status: response.status,
          },
        };
      }

      const responseData: unknown = await response.json();
      const merchant = parseMerchantTransport(responseData);
      if (merchant === null) {
        addSpanEvent("bff.request.update-merchant.invalid-response");
        logWithTrace("error", "Merchant update returned an invalid response.", undefined, "server");
        return {
          success: false,
          error: {
            code: "SERVER_ERROR",
            message: "The merchant update response was invalid. Please try again.",
          },
        };
      }

      revalidatePath("/domains/invoices", "layout");
      return {success: true, data: merchant};
    } catch (error) {
      addSpanEvent("bff.request.update-merchant.error");
      logWithTrace("error", "Merchant update request failed.", undefined, "server");
      return createErrorResult(error, "Unable to update the merchant. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
