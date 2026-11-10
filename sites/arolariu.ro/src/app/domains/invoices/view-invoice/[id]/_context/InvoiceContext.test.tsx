/**
 * @fileoverview Unit tests for the InvoiceContext consumer hook guard.
 * @module app/domains/invoices/view-invoice/[id]/_context/InvoiceContext.test
 */

import {act, render, screen} from "@testing-library/react";
import {Component, type ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {Invoice, Merchant} from "@/types/invoices";
import {TestDataBuilder} from "../../../../../../../tests/helpers";
import {InvoiceContextProvider, useInvoiceContext} from "./InvoiceContext";

class CatchBoundary extends Component<{readonly children: ReactNode}, {readonly message: string | null}> {
  public override state: {readonly message: string | null} = {message: null};

  public static getDerivedStateFromError(error: unknown): {readonly message: string} {
    return {message: error instanceof Error ? error.message : String(error)};
  }

  public override render(): ReactNode {
    return this.state.message === null ? this.props.children : <p role='alert'>{this.state.message}</p>;
  }
}

function Probe(): React.JSX.Element {
  useInvoiceContext();
  return <span>consumed</span>;
}

describe("useInvoiceContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws a descriptive error when used outside an InvoiceContextProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <CatchBoundary>
        <Probe />
      </CatchBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("useInvoiceContext must be used within an InvoiceContextProvider");
    expect(screen.queryByText("consumed")).not.toBeInTheDocument();
  });

  function renderConsumer(invoice: Invoice, merchant: Merchant | null): {readonly replaceInvoice: (next: Invoice) => void} {
    let replace: ((next: Invoice) => void) | null = null;

    function Consumer(): React.JSX.Element {
      const context = useInvoiceContext();
      replace = context.setInvoice;
      return (
        <p>
          {context.invoice.name}|{context.merchant?.name ?? "no-merchant"}
        </p>
      );
    }

    render(
      <InvoiceContextProvider
        invoice={invoice}
        merchant={merchant}>
        <Consumer />
      </InvoiceContextProvider>,
    );

    return {replaceInvoice: (next) => act(() => replace?.(next))};
  }

  it("exposes the provided invoice and merchant and lets consumers replace the invoice", () => {
    const first = TestDataBuilder.build("invoice", {id: "invoice-1", name: "First"});
    const second = TestDataBuilder.build("invoice", {id: "invoice-1", name: "Second"});
    const merchant = TestDataBuilder.build("merchant", {id: "merchant-1", name: "Local Shop"});
    const {replaceInvoice} = renderConsumer(first, merchant);
    expect(screen.getByText("First|Local Shop")).toBeInTheDocument();

    replaceInvoice(second);

    expect(screen.getByText("Second|Local Shop")).toBeInTheDocument();
    expect(screen.queryByText("First|Local Shop")).not.toBeInTheDocument();
  });

  it("exposes a null merchant when the server found none", () => {
    const invoice = TestDataBuilder.build("invoice", {id: "invoice-1", name: "First"});

    renderConsumer(invoice, null);

    expect(screen.getByText("First|no-merchant")).toBeInTheDocument();
  });
});
