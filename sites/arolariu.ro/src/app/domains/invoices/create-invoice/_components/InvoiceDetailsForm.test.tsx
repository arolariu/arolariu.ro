/**
 * @fileoverview Tests for the create-invoice details form.
 * @module app/domains/invoices/create-invoice/_components/InvoiceDetailsForm.test
 *
 * @remarks
 * Uses the real wizard provider, real classification picker and real taxonomy catalog.
 */

import {useScansStore} from "@/stores";
import {PaymentType} from "@/types/invoices";
import {type CachedScan, ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {useEffect} from "react";
import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import InvoiceDetailsForm from "./InvoiceDetailsForm";

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
    cachedAt: new Date("2024-01-02"),
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
    ...overrides,
  };
}

/** Selects the given scans once on mount, as the previous wizard step would. */
function SelectScans({scans}: Readonly<{scans: ReadonlyArray<CachedScan>}>): null {
  const {toggleScan} = useCreateInvoiceContext();
  useEffect(() => {
    for (const scan of scans) toggleScan(scan);
  }, [scans, toggleScan]);
  return null;
}

/** Exposes the wizard state the form writes to. */
function StateProbe(): React.JSX.Element {
  const {invoiceDetails, classificationSelection} = useCreateInvoiceContext();
  return (
    <output data-testid='probe'>
      {JSON.stringify({
        name: invoiceDetails.name,
        paymentType: invoiceDetails.paymentType,
        day: invoiceDetails.transactionDate.getDate(),
        classification: classificationSelection,
      })}
    </output>
  );
}

function readProbe(): {name: string; paymentType: PaymentType; day: number; classification: {code: string} | null} {
  return JSON.parse(screen.getByTestId("probe").textContent ?? "{}") as {
    name: string;
    paymentType: PaymentType;
    day: number;
    classification: {code: string} | null;
  };
}

function renderForm(scans: ReadonlyArray<CachedScan> = []): void {
  render(
    <CreateInvoiceProvider>
      <SelectScans scans={scans} />
      <InvoiceDetailsForm />
      <StateProbe />
    </CreateInvoiceProvider>,
  );
}

describe("InvoiceDetailsForm", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when the tree unmounts.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    await act(async () => {
      await useScansStore.persist.rehydrate();
    });
    act(() => {
      useScansStore.setState({scans: [], selectedScans: [], hasHydrated: true});
    });
  });

  it("hides the scan preview when no scan is selected", () => {
    renderForm();

    expect(screen.getByRole("textbox", {name: /fields\.name\.label/})).toBeInTheDocument();
    expect(screen.queryByText(/scanPreview\.title/)).not.toBeInTheDocument();
  });

  it("previews an image scan with its thumbnail and without the PDF placeholder", () => {
    const scan = buildScan("pic", {name: "pic.jpg"});
    renderForm([scan]);

    expect(screen.getByText(/scanPreview\.title/)).toBeInTheDocument();
    expect(screen.getByRole("img", {name: "pic.jpg"})).toHaveAttribute("src", scan.blobUrl);
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
  });

  it("previews a PDF scan with the placeholder instead of an image", () => {
    renderForm([buildScan("doc", {name: "doc.pdf", mimeType: "application/pdf", scanType: ScanType.PDF})]);

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.queryByRole("img", {name: "doc.pdf"})).not.toBeInTheDocument();
  });

  it("writes the typed invoice name to the wizard state", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(readProbe().name).toBe("");

    await user.type(screen.getByRole("textbox", {name: /fields\.name\.label/}), "Groceries");

    expect(readProbe().name).toBe("Groceries");
  });

  it("writes the chosen payment type to the wizard state", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(readProbe().paymentType).toBe(PaymentType.Unknown);

    await user.click(screen.getByRole("combobox", {name: /fields\.paymentType\.label/}));
    await user.click(await screen.findByRole("option", {name: /options\.card/}));

    expect(readProbe().paymentType).toBe(PaymentType.Card);
  });

  it("writes a picked calendar day to the wizard state and keeps it when the same day is clicked again", async () => {
    const user = userEvent.setup();
    renderForm();
    const initialDay = readProbe().day;
    const targetDay = initialDay === 15 ? 16 : 15;

    await user.click(document.getElementById("transaction-date") as HTMLElement);
    await user.click(await screen.findByRole("button", {name: new RegExp(`\\b${targetDay}(st|nd|rd|th)?,`)}));

    expect(readProbe().day).toBe(targetDay);

    await user.click(screen.getByRole("button", {name: new RegExp(`\\b${targetDay}(st|nd|rd|th)?,`)}));

    expect(readProbe().day).toBe(targetDay);
  });

  it("writes a picked classification to the wizard state", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(readProbe().classification).toBeNull();

    await user.type(screen.getByRole("combobox", {name: /fields\.classification\.label/}), "bread");
    const option = await screen.findByRole("option", {}, {timeout: 3000});
    await user.click(option);

    await waitFor(() => expect(readProbe().classification).not.toBeNull());
  });
});
