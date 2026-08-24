/**
 * @fileoverview Tests for the CreateInvoice orchestration contract.
 * @module app/domains/invoices/create-invoice/_context/CreateInvoiceContext.test
 *
 * @remarks
 * Covers the full create-invoice orchestration sequence:
 * 1. createInvoice -> 2. patchInvoice -> 3. attachScanToInvoice -> 4. analyzeInvoice
 *
 * Partial-failure recovery: if patchInvoice fails after createInvoice succeeds,
 * the invoice id is preserved and a retry must NOT call createInvoice again.
 *
 * D4 contract: when a manual classification was applied, analyzeInvoice must
 * be called with overrides: {invoiceClassification: false}.
 *
 * Mock boundaries: ONLY the server action modules are mocked.
 */

import {type RenderHookResult, act, renderHook, waitFor} from "@testing-library/react";
import {type ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";

// ── Hoisted mock fns — must be created with vi.hoisted so they exist when
//    vi.mock() factory runs (vi.mock is hoisted to top of file) ───────────────
const {
  mockCreateInvoice,
  mockPatchInvoice,
  mockAttachScanToInvoice,
  mockAnalyzeInvoice,
  mockUpdateScan,
  mockMarkScansAsUsedByInvoice,
} = vi.hoisted(() => ({
  mockCreateInvoice: vi.fn(),
  mockPatchInvoice: vi.fn(),
  mockAttachScanToInvoice: vi.fn(),
  mockAnalyzeInvoice: vi.fn(),
  mockUpdateScan: vi.fn(() => Promise.resolve()),
  mockMarkScansAsUsedByInvoice: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  createInvoice: mockCreateInvoice,
  patchInvoice: mockPatchInvoice,
  attachScanToInvoice: mockAttachScanToInvoice,
  analyzeInvoice: mockAnalyzeInvoice,
}));

vi.mock("../../_actions/scans", () => ({
  updateScan: mockUpdateScan,
}));

vi.mock("@/stores", () => ({
  useScansStore: () => ({
    scans: [],
    markScansAsUsedByInvoice: mockMarkScansAsUsedByInvoice,
  }),
}));

import {CreateInvoiceProvider, useCreateInvoiceContext} from "./CreateInvoiceContext";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";

const makeScan = (id: string) => ({
  id,
  userIdentifier: "user-001",
  name: `scan-${id}.jpg`,
  blobUrl: `https://cdn.example.com/scans/${id}.jpg`,
  mimeType: "image/jpeg",
  sizeInBytes: 100_000,
  scanType: "JPEG" as const,
  uploadedAt: new Date(),
  status: "ready" as const,
  metadata: {
    scanId: id,
    ownerId: "user-001",
    documentKind: "receipt" as const,
    documentRole: "primary" as const,
    status: "ready" as const,
    uploadedAt: new Date(),
    uploadedBy: "user-001",
  },
  cachedAt: new Date(),
});

const SCAN_A = makeScan("aaaa");
const SCAN_B = makeScan("bbbb");

function setupHappyPath(): void {
  mockCreateInvoice.mockResolvedValue({success: true, data: {id: INVOICE_ID, userIdentifier: "user-001"}});
  mockPatchInvoice.mockResolvedValue({success: true, data: {id: INVOICE_ID}});
  mockAttachScanToInvoice.mockResolvedValue({success: true, data: undefined});
  mockAnalyzeInvoice.mockResolvedValue({success: true, data: "queue-msg-id"});
}

function wrapper({children}: {readonly children: ReactNode}): React.JSX.Element {
  return <CreateInvoiceProvider>{children}</CreateInvoiceProvider>;
}

async function renderReady(
  scans = [SCAN_A],
): Promise<RenderHookResult<ReturnType<typeof useCreateInvoiceContext>, unknown>> {
  const result = renderHook(() => useCreateInvoiceContext(), {wrapper});

  for (const scan of scans) {
    act(() => {
      result.result.current.toggleScan(scan);
    });
  }

  act(() => {
    result.result.current.goNext();
  });
  act(() => {
    result.result.current.setName("My Invoice");
  });

  return result;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("CreateInvoiceContext — orchestration contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it("calls createInvoice, patchInvoice, attachScanToInvoice, then analyzeInvoice in that order", async () => {
    const callOrder: string[] = [];
    mockCreateInvoice.mockImplementation(async () => {
      callOrder.push("create");
      return {success: true, data: {id: INVOICE_ID, userIdentifier: "user-001"}};
    });
    mockPatchInvoice.mockImplementation(async () => {
      callOrder.push("patch");
      return {success: true, data: {id: INVOICE_ID}};
    });
    mockAttachScanToInvoice.mockImplementation(async () => {
      callOrder.push("attach");
      return {success: true, data: undefined};
    });
    mockAnalyzeInvoice.mockImplementation(async () => {
      callOrder.push("analyze");
      return {success: true, data: "q"};
    });

    const {result} = await renderReady([SCAN_A, SCAN_B]);

    await act(async () => {
      await result.current.createInvoiceWithScans();
    });

    await waitFor(() => {
      expect(callOrder).toEqual(["create", "patch", "attach", "analyze"]);
    });
  });

  it("does NOT smuggle wizard details into additionalMetadata on createInvoice", async () => {
    const {result} = await renderReady();

    await act(async () => {
      await result.current.createInvoiceWithScans();
    });

    const createCall = mockCreateInvoice.mock.calls[0]?.[0] as {metadata: Record<string, string>};
    expect(createCall).toBeDefined();

    const metadata = createCall?.metadata ?? {};
    expect(Object.keys(metadata)).not.toContain("name");
    expect(Object.keys(metadata)).not.toContain("category");
    expect(Object.keys(metadata)).not.toContain("paymentType");
    expect(Object.keys(metadata)).not.toContain("description");
    expect(Object.keys(metadata)).not.toContain("transactionDate");
  });

  it("sends wizard details via patchInvoice, not via createInvoice", async () => {
    const {result} = await renderReady();

    act(() => {
      result.current.setDescription("A test description");
    });

    await act(async () => {
      await result.current.createInvoiceWithScans();
    });

    const patchCall = mockPatchInvoice.mock.calls[0]?.[0] as {
      invoiceId: string;
      payload: {name: string; description: string};
    };
    expect(patchCall).toBeDefined();
    expect(patchCall?.invoiceId).toBe(INVOICE_ID);
    expect(patchCall?.payload.name).toBe("My Invoice");
    expect(patchCall?.payload.description).toBe("A test description");
  });

  describe("partial-failure recovery", () => {
    it("sets partialOutcome with status=partial and the created invoice id when patchInvoice fails", async () => {
      mockPatchInvoice.mockResolvedValue({
        success: false,
        error: {message: "Network error", code: "INTERNAL_ERROR"},
      });

      const {result} = await renderReady();

      await act(async () => {
        await result.current.createInvoiceWithScans();
      });

      await waitFor(() => {
        expect(result.current.partialOutcome).not.toBeNull();
      });
      expect(result.current.partialOutcome?.status).toBe("partial");
      expect(result.current.partialOutcome?.invoiceIdentifier).toBe(INVOICE_ID);
      const outcome = result.current.partialOutcome;
      expect(outcome?.status === "partial" ? outcome.failedStep : null).toBe("patch");
    });

    it("does NOT call createInvoice a second time when retrying after a partial-patch failure", async () => {
      mockPatchInvoice
        .mockResolvedValueOnce({success: false, error: {message: "err", code: "INTERNAL_ERROR"}})
        .mockResolvedValue({success: true, data: {id: INVOICE_ID}});

      const {result} = await renderReady();

      // First call: create succeeds, patch fails -> partial outcome
      await act(async () => {
        await result.current.createInvoiceWithScans();
      });

      await waitFor(() => {
        expect(result.current.partialOutcome?.status).toBe("partial");
      });

      // Retry: patch now succeeds
      await act(async () => {
        await result.current.createInvoiceWithScans();
      });

      await waitFor(() => {
        // createInvoice must have been called exactly ONCE across both attempts
        expect(mockCreateInvoice).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("D4 — manual classification disables invoiceClassification in analysis", () => {
    it("calls analyzeInvoice with overrides.invoiceClassification=false when a manual classification was set", async () => {
      const {result} = await renderReady();

      act(() => {
        result.current.setClassification({system: "ECOICOP_V2", code: "01.1.1"});
      });

      await act(async () => {
        await result.current.createInvoiceWithScans();
      });

      await waitFor(() => {
        expect(mockAnalyzeInvoice).toHaveBeenCalled();
      });

      const analyzeArgs = mockAnalyzeInvoice.mock.calls[0]?.[0] as {
        overrides?: {invoiceClassification?: boolean};
      };
      expect(analyzeArgs?.overrides?.invoiceClassification).toBe(false);
    });

    it("calls analyzeInvoice WITHOUT invoiceClassification override when no manual classification was set", async () => {
      const {result} = await renderReady();

      await act(async () => {
        await result.current.createInvoiceWithScans();
      });

      await waitFor(() => {
        expect(mockAnalyzeInvoice).toHaveBeenCalled();
      });

      const analyzeArgs = mockAnalyzeInvoice.mock.calls[0]?.[0] as {
        overrides?: {invoiceClassification?: boolean};
      };
      expect(analyzeArgs?.overrides?.invoiceClassification).toBeUndefined();
    });
  });
});
