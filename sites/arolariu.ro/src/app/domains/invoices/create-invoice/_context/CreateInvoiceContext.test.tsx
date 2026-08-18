/**
 * @fileoverview Real-module durable-analysis tests for the create-invoice context.
 * @module app/domains/invoices/create-invoice/_context/CreateInvoiceContext.test
 */

import {analysisRouter} from "@/../tests/helpers/analysisNavigation";
import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {useScansStore} from "@/stores";
import {ClassificationSystem, type ClassificationSelection} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {act, render, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../tests/helpers/analysis";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "./CreateInvoiceContext";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";

let invokeCreateInvoiceWithScans: (() => Promise<void>) | null = null;
let selectScan: ((scan: CachedScan) => void) | null = null;
let setName: ((name: string) => void) | null = null;
let setClassification: ((classification: ClassificationSelection | null) => void) | null = null;

/**
 * Exposes the context methods under test without mocking the context or actions.
 *
 * @returns A non-visual context probe.
 */
function ContextProbe(): React.JSX.Element {
  const context = useCreateInvoiceContext();
  invokeCreateInvoiceWithScans = context.createInvoiceWithScans;
  selectScan = context.toggleScan;
  setName = context.setName;
  setClassification = context.setClassification;
  return <div />;
}

function createScan(): CachedScan {
  return {
    id: "scan-1",
    blobUrl: "https://storage.example.test/scan-1.jpg",
    name: "receipt.jpg",
    userIdentifier: "user-1",
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2026-08-17T19:40:42.187Z"),
    cachedAt: new Date("2026-08-17T19:40:42.187Z"),
    status: ScanStatus.READY,
    metadata: {
      scanId: "scan-1",
      ownerId: "user-1",
      displayName: "receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: new Date("2026-08-17T19:40:42.187Z"),
      uploadedBy: "user-1",
    },
  } satisfies CachedScan;
}

function acceptedAnalysisResponse(): Response {
  return new Response(
    JSON.stringify({
      runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      targetType: "invoice",
      targetId: invoiceIdentifier,
      status: "queued",
      profile: "comprehensive",
      acceptedCapabilities: [
        "documentExtraction",
        "merchantResolution",
        "invoiceSummary",
        "productClassification",
        "allergenAssessment",
        "invoiceClassification",
        "recipeGeneration",
      ],
      acceptedAt: "2026-08-17T19:40:42.187Z",
    }),
    {status: 202},
  );
}

describe("CreateInvoiceContext durable analysis enqueue", () => {
  beforeEach(() => {
    analysisRouter.push.mockReset();
    invokeCreateInvoiceWithScans = null;
    selectScan = null;
    setName = null;
    setClassification = null;
    useScansStore.getState().clearScans();
  });

  it("waits for the durable analysis acknowledgement before navigating away from invoice creation", async () => {
    // Arrange
    let resolveAcknowledgement: ((response: Response) => void) | undefined;
    installAnalysisFetchHandler((requestAtBoundary) => {
      if (requestAtBoundary.url.endsWith("/analyze")) {
        return new Promise<Response>((resolve) => {
          resolveAcknowledgement = resolve;
        });
      }

      return new Response(JSON.stringify({id: invoiceIdentifier, userIdentifier: "user-1"}), {status: 201});
    });
    const scan = createScan();
    useScansStore.getState().setScans([scan]);
    render(
      <AnalysisTestProvider>
        <CreateInvoiceProvider>
          <ContextProbe />
        </CreateInvoiceProvider>
      </AnalysisTestProvider>,
    );
    act(() => {
      selectScan?.(scan);
      setName?.("Receipt");
    });

    // Act
    let creation: Promise<void> | undefined;
    act(() => {
      creation = invokeCreateInvoiceWithScans?.();
    });
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toContainEqual(
        expect.objectContaining({
          url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`,
          init: expect.objectContaining({method: "POST"}),
        }),
      );
    });

    // Assert
    expect(analysisRouter.push).not.toHaveBeenCalled();
    await act(async () => {
      resolveAcknowledgement?.(acceptedAnalysisResponse());
      await creation;
    });
    expect(analysisRouter.push).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceIdentifier}`);
  });

  it("keeps the created invoice and navigation when durable analysis enqueue is rejected", async () => {
    // Arrange
    installAnalysisFetchHandler((requestAtBoundary) =>
      requestAtBoundary.url.endsWith("/analyze")
        ? new Response("raw backend body that must remain private", {status: 503})
        : new Response(JSON.stringify({id: invoiceIdentifier, userIdentifier: "user-1"}), {status: 201}),
    );
    const scan = createScan();
    useScansStore.getState().setScans([scan]);
    render(
      <AnalysisTestProvider>
        <CreateInvoiceProvider>
          <ContextProbe />
        </CreateInvoiceProvider>
      </AnalysisTestProvider>,
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
    expect(analysisRouter.push).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceIdentifier}`);
  });

  it("patches a selected ECOICOP selection after the invoice is created", async () => {
    // Arrange
    installAnalysisFetchHandler((requestAtBoundary) => {
      if (requestAtBoundary.url.endsWith("/analyze")) {
        return acceptedAnalysisResponse();
      }

      if (requestAtBoundary.init?.method === "PATCH") {
        return new Response(JSON.stringify({id: invoiceIdentifier, name: "Receipt", description: ""}), {status: 200});
      }

      return new Response(JSON.stringify({id: invoiceIdentifier, userIdentifier: "user-1"}), {status: 201});
    });
    const scan = createScan();
    useScansStore.getState().setScans([scan]);
    render(
      <AnalysisTestProvider>
        <CreateInvoiceProvider>
          <ContextProbe />
        </CreateInvoiceProvider>
      </AnalysisTestProvider>,
    );
    act(() => {
      selectScan?.(scan);
      setName?.("Receipt");
      setClassification?.({system: ClassificationSystem.EcoicopV2, code: "01.1"});
    });

    // Act
    await act(async () => {
      await invokeCreateInvoiceWithScans?.();
    });

    // Assert
    const patchRequest = getAnalysisApiRequests().find((request) => request.init?.method === "PATCH");
    expect(patchRequest).toBeDefined();
    expect(patchRequest?.init?.body).toBe(JSON.stringify({classification: {system: ClassificationSystem.EcoicopV2, code: "01.1"}}));
  });
});
