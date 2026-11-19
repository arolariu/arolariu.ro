/**
 * @fileoverview Unit tests for fetchInvoice server action.
 * @module app/domains/invoices/_actions/invoices/fetchInvoice.test
 */

import {generateGuid} from "@/lib/utils.generic";
import {jwtVerify} from "jose";
import {describe, expect, it} from "vitest";
import {buildInvoice} from "../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, currentUser, fetchAtHttp, jwtSecret} from "../../../../../../tests/setup/server-http";
import {fetchInvoice} from "./fetchInvoice";

describe("fetchInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  it("gets an invoice by id with bearer authorization", async () => {
    const emailAddress = "reader@example.test";
    currentUser.mockResolvedValueOnce({primaryEmailAddress: {emailAddress}});
    const invoice = buildInvoice({
      id: invoiceId,
      userIdentifier: "22222222-2222-4222-8222-222222222222",
      merchantReference: "33333333-3333-4333-8333-333333333333",
    });
    fetchAtHttp.mockResolvedValue(Response.json(invoice));

    const result = await fetchInvoice({invoiceId});

    expect(result).toMatchObject({success: true, data: {id: invoiceId, merchantReference: invoice.merchantReference}});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({cache: "no-store"}),
    );
    const headers = new Headers(fetchAtHttp.mock.calls[0]?.[1]?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    const bearer = headers.get("authorization");
    expect(bearer).toMatch(/^Bearer /u);
    const {payload} = await jwtVerify(bearer?.slice(7) ?? "", new TextEncoder().encode(jwtSecret));
    expect(payload).toMatchObject({
      role: "user",
      aud: "https://api.arolariu.ro",
      sub: emailAddress,
      userIdentifier: generateGuid(emailAddress),
    });
  });

  it("returns an error result for an invalid invoice id", async () => {
    const result = await fetchInvoice({invoiceId: "not-a-guid"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceId");
    }
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [404, "NOT_FOUND", "Invoice not found or you don't have access to it."],
    [403, "AUTH_ERROR", "You are not authorized to view this invoice."],
    [400, "VALIDATION_ERROR", "An error occurred while fetching the invoice. Please try again."],
  ] as const)("returns a public error for upstream HTTP %i", async (status, code, message) => {
    fetchAtHttp.mockResolvedValue(new Response("Invoice unavailable", {status, statusText: "Internal reason"}));

    const result = await fetchInvoice({invoiceId});

    expect(result).toEqual({success: false, error: {code, message, status}});
  });

  it("returns an error result when auth throws", async () => {
    auth.mockRejectedValue(new Error("Auth failed"));

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("returns an error result when fetch throws", async () => {
    fetchAtHttp.mockRejectedValue(new Error("Network error"));

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when auth throws a non-Error", async () => {
    auth.mockRejectedValue({error: "UNAUTHORIZED"});

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("returns a server failure when the API returns a malformed payload", async () => {
    fetchAtHttp.mockResolvedValue(Response.json({}));

    const result = await fetchInvoice({invoiceId});

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The server returned unexpected data. Please try again later."},
    });
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({cache: "no-store"}),
    );
  });
});
