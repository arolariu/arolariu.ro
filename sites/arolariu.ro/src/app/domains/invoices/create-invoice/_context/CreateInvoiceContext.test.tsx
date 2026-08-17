/**
 * @fileoverview Unit tests for background analysis in the create-invoice context.
 * @module app/domains/invoices/create-invoice/_context/CreateInvoiceContext.test
 */

import type {CachedScan} from "@/types/scans";
import {act, render, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "./CreateInvoiceContext";

vi.mock("@/stores", () => ({
  useScansStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  analyzeInvoice: vi.fn(),
  createInvoice: vi.fn(),
}));

vi.mock("../../_actions/scans", () => ({
  updateScan: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const {useScansStore} = await import("@/stores");
const {analyzeInvoice, createInvoice} = await import("../../_actions/invoices");
const {updateScan} = await import("../../_actions/scans");
const {useRouter} = await import("next/navigation");

const mockUseScansStore = vi.mocked(useScansStore);
const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);
const mockCreateInvoice = vi.mocked(createInvoice);
const mockUpdateScan = vi.mocked(updateScan);
const mockUseRouter = vi.mocked(useRouter);

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const scan = {
  id: "scan-1",
  blobUrl: "https://example.test/scan-1.jpg",
  name: "receipt.jpg",
  scanType: "JPEG",
} as unknown as CachedScan;

let invokeCreateInvoiceWithScans: (() => Promise<void>) | null = null;
let selectScan: ((selectedScan: CachedScan) => void) | null = null;
let setName: ((name: string) => void) | null = null;

function ContextProbe(): React.JSX.Element {
  const context = useCreateInvoiceContext();
  invokeCreateInvoiceWithScans = context.createInvoiceWithScans;
  selectScan = context.toggleScan;
  setName = context.setName;
  return <div />;
}

describe("CreateInvoiceContext background analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeCreateInvoiceWithScans = null;
    selectScan = null;
    setName = null;
    mockUseScansStore.mockReturnValue({
      scans: [],
      markScansAsUsedByInvoice: vi.fn(),
    } as unknown as ReturnType<typeof useScansStore>);
    mockUseRouter.mockReturnValue({push: vi.fn()} as unknown as ReturnType<typeof useRouter>);
    mockCreateInvoice.mockResolvedValue({
      success: true,
      data: {id: invoiceIdentifier, userIdentifier: "user-1"},
    } as never);
    mockUpdateScan.mockResolvedValue({success: true, data: {scan: {}} as never});
    mockAnalyzeInvoice.mockResolvedValue({success: true, data: {} as never});
  });

  it("enqueues analysis without waiting for its completion after the invoice is created", async () => {
    // Arrange
    let resolveAnalysis: (() => void) | undefined;
    mockAnalyzeInvoice.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = () => resolve({success: true, data: {} as never});
        }),
    );
    render(
      <CreateInvoiceProvider>
        <ContextProbe />
      </CreateInvoiceProvider>,
    );
    act(() => {
      selectScan?.(scan);
      setName?.("Receipt");
    });

    // Act
    await act(async () => {
      await invokeCreateInvoiceWithScans?.();
    });

    // Assert
    expect(mockAnalyzeInvoice).toHaveBeenCalledWith({
      invoiceIdentifier,
      request: {profile: "comprehensive", overrides: {}},
    });
    expect(mockUseRouter().push).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceIdentifier}`);

    await act(async () => {
      resolveAnalysis?.();
    });
  });

  it("inspects and bounds an analysis action failure without disrupting invoice creation", async () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAnalyzeInvoice.mockResolvedValueOnce({
      success: false,
      error: {code: "SERVER_ERROR", message: "Raw backend payload must not be logged."},
    });
    render(
      <CreateInvoiceProvider>
        <ContextProbe />
      </CreateInvoiceProvider>,
    );
    act(() => {
      selectScan?.(scan);
      setName?.("Receipt");
    });

    // Act
    await act(async () => {
      await invokeCreateInvoiceWithScans?.();
    });

    // Assert
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Background invoice analysis was not accepted:", "SERVER_ERROR");
    });
    expect(mockUseRouter().push).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceIdentifier}`);
    consoleErrorSpy.mockRestore();
  });
});
