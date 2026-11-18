import {revalidatePath} from "next/cache";
import {describe, expect, it, vi} from "vitest";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {deleteInvoice} from "./deleteInvoice";

vi.mock("next/cache", () => ({revalidatePath: vi.fn<typeof revalidatePath>()}));

describe("deleteInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  it("deletes an invoice and revalidates both page views only after the backend succeeds", async () => {
    const pending = Promise.withResolvers<Response>();
    const started = Promise.withResolvers<void>();
    fetchAtHttp.mockImplementationOnce(() => {
      started.resolve();
      return pending.promise;
    });

    const deletion = deleteInvoice({invoiceId});
    try {
      await Promise.race([started.promise, deletion]);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      pending.resolve(new Response(null, {status: 204}));
      await deletion;
    }
    const result = await deletion;

    expect(result).toEqual({success: true, data: undefined});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({method: "DELETE", cache: "no-store"}),
    );
    const [, options] = fetchAtHttp.mock.calls[0] ?? [];
    const headers = new Headers(options?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    expect(options?.body).toBeUndefined();
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      [`/domains/invoices/edit-invoice/${invoiceId}`, "page"],
      [`/domains/invoices/view-invoice/${invoiceId}`, "page"],
    ]);
  });

  it("rejects an invalid invoice identifier before authenticating or calling HTTP", async () => {
    const result = await deleteInvoice({invoiceId: "not-a-guid"});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [404, "Not Found"],
    [403, "Forbidden"],
    [500, "Internal Server Error"],
  ] as const)("returns the HTTP %i failure without revalidating either page", async (status, statusText) => {
    fetchAtHttp.mockResolvedValue(new Response("Invoice could not be deleted", {status, statusText}));

    const result = await deleteInvoice({invoiceId});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: `Failed to delete invoice: ${status} ${statusText}`}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not delete or invalidate pages when the identity provider throws", async () => {
    auth.mockRejectedValue(new Error("Auth failed"));

    const result = await deleteInvoice({invoiceId});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth failed"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Network error"), "Network error"],
    ["Connection closed", "An unexpected error occurred"],
  ] as const)("does not invalidate pages when HTTP rejects with %s", async (reason, message) => {
    fetchAtHttp.mockRejectedValue(reason);

    const result = await deleteInvoice({invoiceId});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
