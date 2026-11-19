/**
 * @fileoverview Unit tests for createInvoice server action.
 * @module app/domains/invoices/_actions/invoices/createInvoice.test
 */

import {jwtVerify} from "jose";
import {beforeEach, describe, expect, it} from "vitest";
import {buildCreateInvoicePayload, buildInvoice, buildInvoiceScan} from "../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, fetchAtHttp, jwtSecret} from "../../../../../../tests/setup/server-http";
import {createInvoice} from "./createInvoice";

describe("createInvoice", () => {
  const sessionUserId = "d35a2a2a-d1d1-55ed-90a7-348c3da59deb";
  const invoiceId = "11111111-1111-4111-8111-111111111111";
  const emptyMerchantId = "00000000-0000-0000-0000-000000000000";

  beforeEach(() => {
    fetchAtHttp.mockResolvedValue(
      Response.json(buildInvoice({id: invoiceId, userIdentifier: sessionUserId, merchantReference: emptyMerchantId})),
    );
  });

  it("posts the scan and metadata with the authenticated identifier and bearer token", async () => {
    const payload = {
      initialScan: buildInvoiceScan({location: "https://storage.example.test/scan.jpg"}),
      additionalMetadata: {isImportant: "false", requiresAnalysis: "true"},
      metadata: {legacy: "unused"},
      classification: null,
      items: [],
      possibleRecipes: [],
      category: 1,
    };

    const result = await createInvoice(payload);

    expect(result).toMatchObject({success: true, data: {id: invoiceId, userIdentifier: sessionUserId, createdAt: expect.any(Date)}});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices`,
      expect.objectContaining({method: "POST", cache: "no-store"}),
    );
    const request = fetchAtHttp.mock.calls[0]?.[1];
    const body: unknown = JSON.parse(String(request?.body));
    expect(body).toEqual({userIdentifier: sessionUserId, initialScan: payload.initialScan, additionalMetadata: payload.additionalMetadata});
    const headers = new Headers(request?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    const bearer = headers.get("authorization");
    expect(bearer).toMatch(/^Bearer /u);
    const token = await jwtVerify(bearer?.slice(7) ?? "", new TextEncoder().encode(jwtSecret));
    expect(token.payload).toMatchObject({userIdentifier: sessionUserId, role: "user"});
  });

  it("preserves an explicit userIdentifier on the wire", async () => {
    const payload = buildCreateInvoicePayload({userIdentifier: "22222222-2222-4222-8222-222222222222"});

    const result = await createInvoice(payload);

    expect(result.success).toBe(true);
    const body: unknown = JSON.parse(String(fetchAtHttp.mock.calls[0]?.[1]?.body));
    expect(body).toEqual(payload);
  });

  it.each([
    [500, "SERVER_ERROR", "A server error occurred. Please try again later."],
    [400, "VALIDATION_ERROR", "Failed to create the invoice. Please check your input and try again."],
  ] as const)("returns a public creation failure for HTTP %i", async (status, code, message) => {
    fetchAtHttp.mockResolvedValue(new Response("Invoice unavailable", {status, statusText: "Internal reason"}));

    const result = await createInvoice({});

    expect(result).toEqual({success: false, error: {code, message, status}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
  });

  it("does not post the invoice when authentication fails", async () => {
    auth.mockRejectedValue(new Error("Auth failed"));

    const result = await createInvoice({});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth failed"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Network error"), "Network error"],
    [{code: "TIMEOUT"}, "An unexpected error occurred"],
  ] as const)("returns a creation failure when the network rejects with %s", async (reason, message) => {
    fetchAtHttp.mockRejectedValue(reason);

    const result = await createInvoice({});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
  });

  it("returns a server failure when the API returns a malformed payload", async () => {
    fetchAtHttp.mockResolvedValue(Response.json({}));

    const result = await createInvoice({});

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The server returned unexpected data. Please try again later."},
    });
  });

  it("accepts the backend's unenriched creation response with an empty name", async () => {
    fetchAtHttp.mockResolvedValue(
      Response.json(buildInvoice({id: invoiceId, userIdentifier: sessionUserId, merchantReference: emptyMerchantId, name: ""})),
    );

    const result = await createInvoice({});

    expect(result).toMatchObject({success: true, data: {name: "", merchantReference: emptyMerchantId}});
  });
});
