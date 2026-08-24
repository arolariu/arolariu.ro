import {describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "../../../src/lib/utils.server";
import {InvoiceScanType} from "../../../src/types/invoices";
import {ScanStatus} from "../../../src/types/scans";
import {TestDataBuilder} from "./testDataBuilder";

describe("TestDataBuilder", () => {
  it("builds typed invoice-domain entities from string kinds", () => {
    const product = TestDataBuilder.build("product", {
      name: "Milk",
      quantity: 2,
      price: 5,
    });
    const invoiceScan = TestDataBuilder.build("invoiceScan", {
      type: InvoiceScanType.PDF,
      location: "https://storage.test/receipt.pdf",
    });
    const invoice = TestDataBuilder.build("invoice", {
      items: [product],
      scans: [invoiceScan],
    });

    expect(product.totalPrice).toBe(10);
    expect(invoice.items).toEqual([product]);
    expect(invoice.scans).toEqual([invoiceScan]);
  });

  it("builds typed DTO payloads and scan entities", () => {
    const createScanPayload = TestDataBuilder.build("createInvoiceScanPayload", {
      location: "https://storage.test/scan.png",
    });
    const createInvoicePayload = TestDataBuilder.build("createInvoicePayload", {
      initialScan: TestDataBuilder.build("invoiceScan", {
        location: "https://storage.test/initial.jpg",
      }),
    });
    const scan = TestDataBuilder.build("scan", {
      id: "scan-test-1",
      status: ScanStatus.READY,
    });

    expect(createScanPayload.location).toBe("https://storage.test/scan.png");
    expect(createInvoicePayload.initialScan.location).toBe("https://storage.test/initial.jpg");
    expect(scan.id).toBe("scan-test-1");
  });

  it("builds auth, server-action, store, HTTP, and Azure helpers", async () => {
    const user = TestDataBuilder.build("userInformation", {
      userIdentifier: "user-custom",
    });
    const anonymousUser = TestDataBuilder.build("anonymousUserInformation");
    const invoice = TestDataBuilder.build("invoice");
    const success = await TestDataBuilder.actionSuccess(invoice);
    const failure = await TestDataBuilder.actionFailure({
      code: "SERVER_ERROR",
      message: "Server failed",
    });
    const store = TestDataBuilder.entityStore({
      entities: [invoice],
    });
    const response = TestDataBuilder.jsonResponse({ok: true});
    const blobServiceClient = TestDataBuilder.blobServiceClient({
      blobUrl: "https://storage.test/blob.jpg",
    });

    expect(user.userIdentifier).toBe("user-custom");
    expect(anonymousUser.user).toBeNull();
    expect(success.success).toBe(true);
    expect(failure.success).toBe(false);
    expect(store.entities).toEqual([invoice]);
    await expect(response.json()).resolves.toEqual({ok: true});
    expect(blobServiceClient.getContainerClient("invoices").getBlockBlobClient("blob.jpg").url).toBe("https://storage.test/blob.jpg");
  });

  it("configures typed server-action mocks through facade helpers", async () => {
    const action = vi.fn<() => ServerActionResult<string>>();

    TestDataBuilder.mockResolvedActionSuccess(action, "ok");
    TestDataBuilder.mockResolvedActionFailure(action, {
      code: "UNKNOWN_ERROR",
      message: "Nope",
    });

    await expect(action()).resolves.toEqual({success: true, data: "ok"});
    await expect(action()).resolves.toEqual({
      success: false,
      error: {code: "UNKNOWN_ERROR", message: "Nope"},
    });
  });
});
