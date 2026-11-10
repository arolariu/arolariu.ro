/**
 * @fileoverview Tests for the create-invoice ReviewStep summary and submit states.
 * @module app/domains/invoices/create-invoice/_components/ReviewStep.test
 *
 * @remarks
 * Uses the real provider and the real invoice server actions. Only the network boundary
 * (`fetchWithTimeout`) and the BFF auth lookup are substituted through the configured stubs.
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {PaymentType} from "@/types/invoices";
import {type CachedScan, ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import ReviewStep from "./ReviewStep";

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

type FetchResponse = Awaited<ReturnType<typeof fetchWithTimeout>>;
type CreateInvoiceContextValue = ReturnType<typeof useCreateInvoiceContext>;

let context: CreateInvoiceContextValue;

function ContextCapture(): null {
  context = useCreateInvoiceContext();
  return null;
}

function buildScan(id: string, overrides: Partial<CachedScan> = {}): CachedScan {
  return {
    id,
    userIdentifier: "user-001",
    name: `Scan ${id}`,
    blobUrl: `https://storage.blob.core.windows.net/invoices/scans/user-001/${id}.jpg`,
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2024-01-01"),
    status: ScanStatus.READY,
    metadata: {
      scanId: id,
      ownerId: "user-001",
      displayName: `Scan ${id}`,
      documentKind: ScanDocumentKind.RECEIPT,
      documentRole: ScanDocumentRole.PRIMARY,
      status: ScanMetadataStatus.READY,
      uploadedAt: new Date("2024-01-01"),
      uploadedBy: "user-001",
    },
    cachedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

function textResponse(status: number): FetchResponse {
  return new Response("failure", {status}) as FetchResponse;
}

function invoiceResponse(): FetchResponse {
  return TestDataBuilder.jsonResponse(
    TestDataBuilder.build("invoice", {
      id: INVOICE_ID,
      userIdentifier: "22222222-2222-4222-8222-222222222222",
      merchantReference: "33333333-3333-4333-8333-333333333333",
    }),
  ) as FetchResponse;
}

function renderReviewStep(): void {
  render(
    <CreateInvoiceProvider>
      <ContextCapture />
      <ReviewStep />
    </CreateInvoiceProvider>,
  );
}

function selectScans(...scans: CachedScan[]): void {
  act(() => {
    for (const scan of scans) {
      context.toggleScan(scan);
    }
    context.setName("Groceries");
  });
}

const CREATE_BUTTON = /reviewStep\.actions\.create$/;

describe("ReviewStep", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when the step unmounts.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(() => {
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
  });

  describe("summary", () => {
    it("renders a PDF placeholder for PDF scans and an image for image scans", () => {
      renderReviewStep();
      const pdfByMime = buildScan("pdf-mime", {mimeType: "application/pdf", scanType: ScanType.PDF});
      const pdfByUrl = buildScan("pdf-url", {blobUrl: "https://storage.blob.core.windows.net/scans/receipt.pdf"});
      const image = buildScan("image-only");

      selectScans(pdfByMime, pdfByUrl, image);

      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(screen.getByRole("img")).toHaveAttribute("alt", image.name);
      expect(screen.getByText(pdfByMime.name)).toBeInTheDocument();
      expect(screen.getByText(pdfByUrl.name)).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows the no-classification fallback until a classification is chosen, then its code", () => {
      renderReviewStep();
      selectScans(buildScan("one"));

      expect(screen.getByText(/details\.noClassification/)).toBeInTheDocument();

      act(() => {
        context.setClassification({system: "ECOICOP_V2", code: "01.1.1"});
      });

      expect(screen.getByText("01.1.1")).toBeInTheDocument();
      expect(screen.queryByText(/details\.noClassification/)).not.toBeInTheDocument();
    });

    it("renders the description row only when a description is provided", () => {
      renderReviewStep();
      selectScans(buildScan("one"));

      expect(screen.queryByText(/details\.description$/)).not.toBeInTheDocument();

      act(() => {
        context.setDescription("Weekly groceries");
      });

      expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
      expect(screen.getByText(/details\.description$/)).toBeInTheDocument();
    });

    it("labels the payment type with the matching translation key", () => {
      renderReviewStep();
      selectScans(buildScan("one"));

      expect(screen.getByText(/paymentTypes\.unknown$/)).toBeInTheDocument();

      act(() => {
        context.setPaymentType(PaymentType.Card);
      });

      expect(screen.getByText(/paymentTypes\.card$/)).toBeInTheDocument();
      expect(screen.queryByText(/paymentTypes\.unknown$/)).not.toBeInTheDocument();
    });
  });

  describe("submit through the real server actions", () => {
    beforeEach(() => {
      vi.spyOn(console, "info").mockImplementation(() => undefined);
    });

    it("shows the creating spinner state and disables the button while creation is pending", async () => {
      const user = userEvent.setup();
      let releaseCreate: (response: FetchResponse) => void = () => undefined;
      mockFetchWithTimeout.mockReturnValue(
        new Promise<FetchResponse>((resolve) => {
          releaseCreate = resolve;
        }),
      );
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      renderReviewStep();
      selectScans(buildScan("one"));

      await user.click(screen.getByRole("button", {name: CREATE_BUTTON}));

      const creating = await screen.findByRole("button", {name: /actions\.creating$/});
      expect(creating).toBeDisabled();
      expect(screen.queryByRole("button", {name: CREATE_BUTTON})).not.toBeInTheDocument();

      await act(async () => {
        releaseCreate(textResponse(500));
      });

      await waitFor(() => expect(screen.getByRole("button", {name: CREATE_BUTTON})).toBeEnabled());
      expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
    });

    it("shows the patch partial-failure card and a retry label when the PATCH fails after create succeeds", async () => {
      const user = userEvent.setup();
      mockFetchWithTimeout.mockImplementation(async (_url, init) => (init?.method === "POST" ? invoiceResponse() : textResponse(500)));
      renderReviewStep();
      selectScans(buildScan("one"));

      await user.click(screen.getByRole("button", {name: CREATE_BUTTON}));

      expect(await screen.findByText(/partialError\.patchFailed$/)).toBeInTheDocument();
      expect(screen.getByText(/partialError\.title$/)).toBeInTheDocument();
      expect(screen.queryByText(/partialError\.scansFailed$/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", {name: /partialError\.retry$/})).toBeEnabled();
      expect(screen.queryByRole("button", {name: /partialError\.retryScans$/})).not.toBeInTheDocument();
      expect(context.partialOutcome).toMatchObject({status: "partial", invoiceIdentifier: INVOICE_ID, failedStep: "patch"});
    });

    it("shows the scans partial-failure card and a scans retry label when attaching an additional scan fails", async () => {
      const user = userEvent.setup();
      mockFetchWithTimeout.mockImplementation(async (url, init) => {
        if (url === "/rest/v1/invoices") return invoiceResponse();
        if (init?.method === "PATCH") return invoiceResponse();
        return textResponse(500);
      });
      renderReviewStep();
      selectScans(buildScan("one"), buildScan("two"));

      await user.click(screen.getByRole("button", {name: CREATE_BUTTON}));

      expect(await screen.findByText(/partialError\.scansFailed$/)).toBeInTheDocument();
      expect(screen.queryByText(/partialError\.patchFailed$/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", {name: /partialError\.retryScans$/})).toBeEnabled();
      expect(context.partialOutcome).toMatchObject({status: "partial", invoiceIdentifier: INVOICE_ID, failedStep: "scans"});
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(`/rest/v1/invoices/${INVOICE_ID}/scans`, expect.objectContaining({method: "POST"}));
    });
  });
});
