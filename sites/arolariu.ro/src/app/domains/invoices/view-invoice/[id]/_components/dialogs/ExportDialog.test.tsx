/**
 * @fileoverview Unit tests for ExportDialog component.
 * @module domains/invoices/view-invoice/[id]/components/dialogs/ExportDialog.test
 */

import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {ExportDialog} from "./ExportDialog";

// Mock dependencies
vi.mock("@/app/domains/invoices/_contexts/DialogContext", () => ({
  useDialog: vi.fn(() => ({
    isOpen: true,
    close: vi.fn(),
  })),
}));

vi.mock("../../_context/InvoiceContext", () => ({
  useInvoiceContext: vi.fn(() => ({
    invoice: {
      id: "test-invoice-id",
      name: "Test Invoice",
      items: [
        {
          name: "Test Product",
          quantity: 2,
          unitPrice: 10.5,
          totalPrice: 21.0,
          category: "Test Category",
        },
      ],
      paymentInformation: {
        totalCostAmount: 21.0,
        paymentDate: new Date("2024-01-01"),
      },
    },
    merchant: {
      name: "Test Merchant",
    },
  })),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ExportDialog", () => {
  it("should render the export dialog", () => {
    render(<ExportDialog />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("should display all export options", () => {
    render(<ExportDialog />);
    expect(screen.getByText("print.title")).toBeInTheDocument();
    expect(screen.getByText("csv.title")).toBeInTheDocument();
    expect(screen.getByText("json.title")).toBeInTheDocument();
    expect(screen.getByText("copySummary.title")).toBeInTheDocument();
  });
});
