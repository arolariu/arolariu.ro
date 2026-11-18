import {describe, expect, it, vi} from "vitest";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {analyzeInvoice} from "./analyzeInvoice";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const endpoint = `${apiUrl}/rest/v1/invoices/${invoiceIdentifier}/analyze`;

describe("analyzeInvoice", () => {
  it("posts the flat capability request and returns the accepted queue identifier", async () => {
    fetchAtHttp.mockResolvedValue(Response.json("queue-message-42", {status: 202}));

    const result = await analyzeInvoice({invoiceIdentifier, profile: "balanced"});

    expect(result).toEqual({success: true, data: "queue-message-42"});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      endpoint,
      expect.objectContaining({method: "POST", cache: "no-store", body: '{"profile":"balanced"}'}),
    );
    const headers = new Headers(fetchAtHttp.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("keeps the preset on the wire when an individual capability changes", async () => {
    fetchAtHttp.mockResolvedValue(Response.json("queue-message-42", {status: 202}));

    const result = await analyzeInvoice({invoiceIdentifier, profile: "fast", overrides: {invoiceSummary: true}});

    expect(result).toEqual({success: true, data: "queue-message-42"});
    expect(JSON.parse(String(fetchAtHttp.mock.calls[0]?.[1]?.body))).toEqual({profile: "fast", invoiceSummary: true});
  });

  it("rejects a malformed accepted response from the real parser", async () => {
    fetchAtHttp.mockResolvedValue(Response.json({messageId: "queue-message-42"}, {status: 202}));

    const result = await analyzeInvoice({invoiceIdentifier, profile: "balanced"});

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The server returned an unexpected response. Please try again later."},
    });
  });

  it("rejects an invalid invoice identifier before reaching authentication or HTTP", async () => {
    const result = await analyzeInvoice({invoiceIdentifier: "not-a-guid", profile: "balanced"});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceIdentifier")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [500, "Internal Server Error"],
    [400, "Bad Request"],
  ] as const)("returns an error when the analysis endpoint responds with HTTP %i", async (status, statusText) => {
    fetchAtHttp.mockResolvedValue(new Response("Analysis refused", {status, statusText}));

    const result = await analyzeInvoice({invoiceIdentifier, profile: "balanced"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: `Failed to analyze invoice: ${status} ${statusText}`}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
  });

  it.each([
    [new Error("Auth failed"), "Auth failed"],
    ["Auth string error", "Unknown analysis error"],
  ] as const)("does not submit analysis when the identity provider rejects with %s", async (reason, message) => {
    auth.mockRejectedValue(reason);

    const result = await analyzeInvoice({invoiceIdentifier, profile: "balanced"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("returns a network rejection as an error result", async () => {
    fetchAtHttp.mockRejectedValue(new Error("Network error"));

    const result = await analyzeInvoice({invoiceIdentifier, profile: "balanced"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Network error"}});
  });

  it("aborts an in-flight analysis request at sixty seconds, not before", async () => {
    const started = Promise.withResolvers<AbortSignal>();
    const request = Promise.withResolvers<Response>();
    fetchAtHttp.mockImplementation((_url, options) => {
      const {signal} = options ?? {};
      if (!signal) throw new Error("Missing HTTP signal");
      started.resolve(signal);
      signal.addEventListener("abort", () => request.reject(signal.reason), {once: true});
      return request.promise;
    });
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const pending = analyzeInvoice({invoiceIdentifier, profile: "comprehensive"});

    try {
      const signal = await Promise.race([started.promise, pending.then(() => null)]);
      await vi.advanceTimersByTimeAsync(59_999);
      expect(signal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);

      expect(signal?.aborted).toBe(true);
      await expect(pending).resolves.toEqual({
        success: false,
        error: {code: "TIMEOUT_ERROR", message: "Request timed out after 60000ms"},
      });
    } finally {
      try {
        request.resolve(new Response(null, {status: 503, statusText: "Service Unavailable"}));
        await pending;
      } finally {
        vi.useRealTimers();
      }
    }
  });
});
