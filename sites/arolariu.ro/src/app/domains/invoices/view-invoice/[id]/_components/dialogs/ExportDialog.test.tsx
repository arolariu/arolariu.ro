/**
 * @fileoverview Unit tests for ExportDialog component.
 * @module domains/invoices/view-invoice/[id]/components/dialogs/ExportDialog.test
 */

import {render, screen} from "@testing-library/react";
import {useEffect} from "react";
import {describe, expect, it, vi} from "vitest";
import {DialogProvider, useDialogs} from "../../../../_contexts/DialogContext";
import {ExportDialog} from "./ExportDialog";

// Mock @arolariu/components
vi.mock("@arolariu/components", () => ({
  Dialog: ({children, open}: {children: React.ReactNode; open?: boolean}) => (open ? <div>{children}</div> : null),
  DialogContent: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogHeader: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogTitle: ({children}: {children: React.ReactNode}) => <h2>{children}</h2>,
  DialogDescription: ({children}: {children: React.ReactNode}) => <p>{children}</p>,
  Button: ({children, onClick}: {children: React.ReactNode; onClick?: () => void}) => <button onClick={onClick}>{children}</button>,
  toast: vi.fn(),
}));

// Mock InvoiceContext
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
        transactionDate: new Date("2024-01-01"),
      },
    },
    merchant: {
      name: "Test Merchant",
    },
  })),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

/** Test component that opens the dialog on mount */
function TestComponentWithDialog() {
  const {openDialog} = useDialogs();
  useEffect(() => {
    openDialog("VIEW_INVOICE__EXPORT");
  }, [openDialog]);
  return <ExportDialog />;
}

describe("ExportDialog", () => {
  it("should render the export dialog", () => {
    render(
      <DialogProvider>
        <TestComponentWithDialog />
      </DialogProvider>,
    );

    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("should display all export options", () => {
    render(
      <DialogProvider>
        <TestComponentWithDialog />
      </DialogProvider>,
    );

    expect(screen.getByText("print.title")).toBeInTheDocument();
    expect(screen.getByText("csv.title")).toBeInTheDocument();
    expect(screen.getByText("json.title")).toBeInTheDocument();
    expect(screen.getByText("copySummary.title")).toBeInTheDocument();
  });
});
