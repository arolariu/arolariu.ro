/**
 * @fileoverview Real-module integration tests for honest create-invoice feedback.
 * @module app/domains/invoices/view-scans/_dialogs/CreateInvoiceDialog.test
 */

import {useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {createInvoiceBuilder} from "@/data/mocks/invoice";
import {useInvoicesStore, useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {act, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../tests/helpers/analysis";
import {ANALYSIS_API_URL, installAnalysisFetchHandler} from "../../../../../../tests/helpers/analysisBoundary";
import {DialogProvider} from "../../_contexts/DialogContext";
import CreateInvoiceDialog from "./CreateInvoiceDialog";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";

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

function queuedAnalysisResponse(): Response {
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

function createdInvoiceResponse(): Response {
  return Response.json(createInvoiceBuilder().withId(invoiceIdentifier).build(), {status: 201});
}

function DialogScenario(): React.JSX.Element {
  const {currentDialog, openDialog} = useDialogs();
  const scan = createScan();

  return (
    <>
      <button
        type='button'
        aria-label='Open invoice creation dialog'
        onClick={() => openDialog("VIEW_SCANS__CREATE_INVOICE", "add", {selectedScans: [scan]})}>
        Open
      </button>
      {currentDialog.type === "VIEW_SCANS__CREATE_INVOICE" ? <CreateInvoiceDialog /> : null}
    </>
  );
}

function renderDialogScenario(): void {
  render(
    <AnalysisTestProvider>
      <DialogProvider>
        <DialogScenario />
      </DialogProvider>
    </AnalysisTestProvider>,
  );
}

describe("CreateInvoiceDialog", () => {
  beforeEach(() => {
    useInvoicesStore.getState().clearEntities();
    useInvoicesStore.getState().clearSelectedEntities();
    useScansStore.getState().clearScans();
    useScansStore.getState().clearSelectedScans();
  });

  it("reports only durable enqueue acknowledgement, preserves real store state, and closes accessibly", async () => {
    // Arrange
    let resolveInvoiceCreation: ((response: Response) => void) | undefined;
    installAnalysisFetchHandler((request) => {
      if (request.url === `${ANALYSIS_API_URL}/rest/v1/invoices`) {
        return new Promise<Response>((resolve) => {
          resolveInvoiceCreation = resolve;
        });
      }

      if (request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`) {
        return queuedAnalysisResponse();
      }

      if (request.url.endsWith("/scans/scan-1")) {
        return new Response(null, {status: 200});
      }

      return new Response(null, {status: 404});
    });
    const user = userEvent.setup();
    renderDialogScenario();

    // Act
    await user.click(screen.getByRole("button", {name: "Open invoice creation dialog"}));
    const dialog = await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", {name: "Create invoice"}));

    // Assert
    const activeElement = document.activeElement;
    expect(activeElement).toBeInstanceOf(HTMLElement);
    if (activeElement instanceof HTMLElement) {
      expect(dialog).toContainElement(activeElement);
    }
    const creatingStatus = await screen.findByRole("status");
    expect(creatingStatus).toHaveAttribute("aria-busy", "true");
    expect(creatingStatus).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/preparing document|running OCR|finalizing results|%/iu)).not.toBeInTheDocument();

    // Act
    await act(async () => {
      resolveInvoiceCreation?.(createdInvoiceResponse());
      await Promise.resolve();
    });

    // Assert
    expect(await screen.findByText("Analysis was queued. Results will appear after it finishes.")).toBeInTheDocument();
    expect(useInvoicesStore.getState().entities).toEqual([expect.objectContaining({id: invoiceIdentifier})]);
    const viewInvoiceButton = await screen.findByRole("button", {name: "View Invoice"});
    const completedDialog = viewInvoiceButton.closest("[role='dialog']");
    if (!(completedDialog instanceof HTMLElement)) {
      throw new Error("Expected the completed invoice controls to remain inside the dialog.");
    }
    await user.click(within(completedDialog).getByRole("button", {name: "Close"}));
    await waitFor(() => {
      expect(completedDialog).not.toBeInTheDocument();
    });
  });

  it("preserves the created invoice and reports retryable not-queued feedback when enqueueing is rejected", async () => {
    // Arrange
    installAnalysisFetchHandler((request) => {
      if (request.url === `${ANALYSIS_API_URL}/rest/v1/invoices`) {
        return createdInvoiceResponse();
      }

      if (request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`) {
        return new Response(null, {status: 503});
      }

      if (request.url.endsWith("/scans/scan-1")) {
        return new Response(null, {status: 200});
      }

      return new Response(null, {status: 404});
    });
    const user = userEvent.setup();
    renderDialogScenario();

    // Act
    await user.click(screen.getByRole("button", {name: "Open invoice creation dialog"}));
    await user.click(screen.getByRole("button", {name: "Create invoice"}));

    // Assert
    expect(
      await screen.findByText("Invoices were created, but analysis could not be queued. You can retry analysis from the invoice page."),
    ).toBeInTheDocument();
    expect(useInvoicesStore.getState().entities).toEqual([expect.objectContaining({id: invoiceIdentifier})]);
    expect(useScansStore.getState().scans).toEqual([]);
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });
});
