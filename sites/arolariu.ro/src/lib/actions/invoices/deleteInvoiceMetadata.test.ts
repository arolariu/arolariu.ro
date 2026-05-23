import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/instrumentation.server", () => ({
  withSpan: async <T,>(_name: string, fn: () => Promise<T>) => fn(),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  injectTraceContextHeaders: vi.fn((headers: Headers) => headers),
  recordSpanError: vi.fn(),
}));

vi.mock("@/lib/config/configProxy", () => ({
  fetchApiUrl: async () => "https://mock-api",
}));

vi.mock("@/lib/utils.generic", () => ({
  validateStringIsGuidType: (input: string, paramName = "identifier"): void => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

    if (!uuidRegex.test(input)) {
      throw new Error(`Invalid ${paramName}: \"${input}\" is not a valid GUID`);
    }
  },
}));

vi.mock("../../utils.server", () => ({
  fetchWithTimeout: async (url: string, options?: RequestInit): Promise<Response> => fetch(`https://mock-api${url}`, options),
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(async () => ({
    userJwt: "mock-jwt-token",
    userIdentifier: "11111111-1111-1111-1111-111111111111",
  })),
}));

import {deleteInvoiceMetadata} from "./deleteInvoiceMetadata";

const VALID_INVOICE_ID = "22222222-2222-4222-8222-222222222222";

describe("deleteInvoiceMetadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("issues DELETE to the metadata endpoint with the camelCase keys body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {status: 204}),
    );

    await deleteInvoiceMetadata({invoiceId: VALID_INVOICE_ID, key: "color"});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(`https://mock-api/rest/v1/invoices/${VALID_INVOICE_ID}/metadata`);
    expect(init?.method).toBe("DELETE");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer mock-jwt-token",
    });
    expect(init?.body).toBe(JSON.stringify({keys: ["color"]}));
  });

  it("rejects an invalid invoiceId guid", async () => {
    await expect(
      deleteInvoiceMetadata({invoiceId: "not-a-guid", key: "color"}),
    ).rejects.toThrow();
  });

  it("rejects an empty key", async () => {
    await expect(
      deleteInvoiceMetadata({invoiceId: VALID_INVOICE_ID, key: ""}),
    ).rejects.toThrow();
  });

  it("throws when the API responds with a non-OK status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("metadata key not found", {status: 404}),
    );

    await expect(
      deleteInvoiceMetadata({invoiceId: VALID_INVOICE_ID, key: "missing"}),
    ).rejects.toThrow(/404|metadata key not found/);
  });

  it("propagates auth failures", async () => {
    const {fetchBFFUserFromAuthService} = await import("../user/fetchUser");
    vi.mocked(fetchBFFUserFromAuthService).mockRejectedValueOnce(
      new Error("auth failed"),
    );

    await expect(
      deleteInvoiceMetadata({invoiceId: VALID_INVOICE_ID, key: "color"}),
    ).rejects.toThrow("auth failed");
  });
});
