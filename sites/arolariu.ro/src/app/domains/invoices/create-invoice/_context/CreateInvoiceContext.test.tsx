/**
 * @fileoverview Durable analysis enqueue tests for the create-invoice context.
 * @module app/domains/invoices/create-invoice/_context/CreateInvoiceContext.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {act, render, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "./CreateInvoiceContext";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({push: navigationMocks.push}),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations:
    () =>
    (
      selector: (messages: {
        forms: {
          invoices: {
            createInvoice: {
              notifications: {
                analysisNotQueued: string;
                createFailed: string;
                createdAndAnalysisQueued: string;
              };
            };
          };
        };
      }) => string,
    ) =>
      selector({
        forms: {
          invoices: {
            createInvoice: {
              notifications: {
                analysisNotQueued: "Analysis was not queued.",
                createFailed: "Invoice creation failed.",
                createdAndAnalysisQueued: "Analysis was queued.",
              },
            },
          },
        },
      }),
}));

const mockFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

const INVOICE_IDENTIFIER = "11111111-1111-4111-8111-111111111111";
const ANALYSIS_RUN_IDENTIFIER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let invokeCreateInvoiceWithScans: (() => Promise<void>) | null = null;
let selectScan: ((scan: CachedScan) => void) | null = null;
let setName: ((name: string) => void) | null = null;

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
  return <div />;
}

/**
 * Creates a selected scan fixture.
 *
 * @returns A ready cached scan.
 */
function createScan(): CachedScan {
  return {
    id: "scan-1",
    blobUrl: "https://storage.example.test/scan-1.jpg",
    name: "receipt.jpg",
    scanType: ScanType.JPEG,
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
  } as CachedScan;
}

/**
 * Returns a durable analysis enqueue acknowledgement.
 *
 * @returns An HTTP 202 response.
 */
function acceptedAnalysisResponse(): Response {
  return new Response(
    JSON.stringify({
      runId: ANALYSIS_RUN_IDENTIFIER,
      targetType: "invoice",
      targetId: INVOICE_IDENTIFIER,
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
    vi.clearAllMocks();
    navigationMocks.push.mockReset();
    invokeCreateInvoiceWithScans = null;
    selectScan = null;
    setName = null;
    useScansStore.getState().clearScans();
    mockFetchBffUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1", user: null});
  });

  it("waits for the durable analysis acknowledgement before navigating away from invoice creation", async () => {
    // Arrange
    let resolveAcknowledgement: ((response: Response) => void) | undefined;
    mockFetchWithTimeout.mockImplementation((url: string) => {
      if (url.endsWith("/analyze")) {
        return new Promise<Response>((resolve) => {
          resolveAcknowledgement = resolve;
        });
      }

      return Promise.resolve(new Response(JSON.stringify({id: INVOICE_IDENTIFIER, userIdentifier: "user-1"}), {status: 201}));
    });
    const scan = createScan();
    useScansStore.getState().setScans([scan]);
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
    let creation: Promise<void> | undefined;
    act(() => {
      creation = invokeCreateInvoiceWithScans?.();
    });
    await waitFor(() => {
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        `/rest/v1/invoices/${INVOICE_IDENTIFIER}/analyze`,
        expect.objectContaining({method: "POST"}),
        15_000,
      );
    });

    // Assert
    expect(navigationMocks.push).not.toHaveBeenCalled();
    resolveAcknowledgement?.(acceptedAnalysisResponse());
    await act(async () => {
      await creation;
    });
    expect(navigationMocks.push).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${INVOICE_IDENTIFIER}`);
  });

  it("keeps the created invoice and navigation when durable analysis enqueue is rejected", async () => {
    // Arrange
    mockFetchWithTimeout.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/analyze")
          ? new Response("raw backend body that must remain private", {status: 503})
          : new Response(JSON.stringify({id: INVOICE_IDENTIFIER, userIdentifier: "user-1"}), {status: 201}),
      ),
    );
    const scan = createScan();
    useScansStore.getState().setScans([scan]);
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
    expect(navigationMocks.push).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${INVOICE_IDENTIFIER}`);
  });
});
