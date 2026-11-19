import {afterEach, describe, expect, it, vi} from "vitest";
import {buildInvoice} from "../../../../../../tests/helpers/builders/domain";
import {exportInvoices} from "./export";

describe("exportInvoices", () => {
  afterEach(() => vi.useRealTimers());

  it("exports a filtered copy and uses the dated filename when the requested name is only dots", async () => {
    const invoice = buildInvoice({additionalMetadata: {source: "receipt"}});
    const original = structuredClone(invoice);
    const url = "blob:https://example.test/invoice-export";
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue(url);
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.useFakeTimers({toFake: ["Date", "setTimeout", "clearTimeout"]});
    vi.setSystemTime(0);

    exportInvoices([invoice], {format: "json", includeMerchant: false, includeMetadata: false, includeProducts: false}, "..");

    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.contexts[0]).toMatchObject({download: "invoices_0.json", href: url});
    expect(createUrl).toHaveBeenCalledOnce();
    const blob = createUrl.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new Error("Expected an invoice export Blob");
    expect(blob.type).toBe("application/json");
    const exported: unknown = JSON.parse(await blob.text());
    expect(exported).toEqual([expect.objectContaining({id: invoice.id, merchantReference: "", additionalMetadata: {}, items: []})]);
    expect(invoice).toEqual(original);

    vi.advanceTimersByTime(999);
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(url);
  });

  it.each(["csv", "pdf"] as const)("rejects an unimplemented %s export without triggering a download", (format) => {
    const createUrl = vi.spyOn(URL, "createObjectURL");

    expect(() => exportInvoices([], {format, includeMerchant: true, includeMetadata: true, includeProducts: true})).toThrow(
      `${format.toUpperCase()} export is not yet implemented. Please use JSON export.`,
    );
    expect(createUrl).not.toHaveBeenCalled();
  });
});
