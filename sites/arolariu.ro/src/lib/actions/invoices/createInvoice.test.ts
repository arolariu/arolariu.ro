/**
 * @fileoverview Unit tests for invoice creation action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/createInvoice/tests
 */

import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import {InvoiceScanType} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {createInvoice} from "./createInvoice";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("createInvoice", () => {
  const mockToken = "mock-token";
  const mockUserIdentifier = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create an invoice successfully", async () => {
    const mockMerchant = new MerchantBuilder().withName("Test Merchant").build();
    const mockScan = {
      scanType: InvoiceScanType.JPEG,
      location: "https://cdn.arolariu.ro/invoices/test-scan.jpg",
      metadata: {},
    };
    const mockPayload = {
      userIdentifier: mockUserIdentifier,
      initialScan: mockScan,
      metadata: {
        isImportant: "false",
        requiresAnalysis: "true",
      },
    };
    const mockInvoice = new InvoiceBuilder().withId("created-invoice-id").withMerchantReference(mockMerchant.id).build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    const result = await createInvoice(mockPayload);

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("https://mock-api/rest/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...mockPayload, userIdentifier: mockUserIdentifier}),
    });
    expect(result).toEqual(mockInvoice);
  });

  it("should use provided userIdentifier if present", async () => {
    const providedUserId = "provided-id";
    const mockScan = {
      scanType: InvoiceScanType.JPEG,
      location: "https://cdn.arolariu.ro/invoices/test-scan.jpg",
      metadata: {},
    };
    const mockPayload = {
      userIdentifier: providedUserId,
      initialScan: mockScan,
      metadata: {
        isImportant: "false",
        requiresAnalysis: "true",
      },
    };
    const mockInvoice = new InvoiceBuilder().withUserIdentifier(providedUserId).build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: "default-id",
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    await createInvoice(mockPayload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(mockPayload),
      }),
    );
  });

  it("should add userIdentifier from auth when payload does not have one", async () => {
    const mockScan = {
      scanType: InvoiceScanType.JPEG,
      location: "https://cdn.arolariu.ro/invoices/test-scan.jpg",
      metadata: {},
    };
    // Payload without userIdentifier (or with empty string)
    const mockPayload = {
      userIdentifier: "",
      initialScan: mockScan,
      metadata: {
        isImportant: "false",
        requiresAnalysis: "true",
      },
    };
    const mockInvoice = new InvoiceBuilder().withUserIdentifier(mockUserIdentifier).build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    await createInvoice(mockPayload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({...mockPayload, userIdentifier: mockUserIdentifier}),
      }),
    );
  });

  it("should throw an error if creation fails", async () => {
    const mockScan = {
      scanType: InvoiceScanType.JPEG,
      location: "https://cdn.arolariu.ro/invoices/test-scan.jpg",
      metadata: {},
    };
    const mockPayload = {
      userIdentifier: mockUserIdentifier,
      initialScan: mockScan,
      metadata: {
        isImportant: "false",
        requiresAnalysis: "true",
      },
    };
    const errorMessage = "Bad Request";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => errorMessage,
    });

    await expect(createInvoice(mockPayload)).rejects.toThrow(`BFF create invoice request failed: 400 Bad Request - ${errorMessage}`);
  });
});
