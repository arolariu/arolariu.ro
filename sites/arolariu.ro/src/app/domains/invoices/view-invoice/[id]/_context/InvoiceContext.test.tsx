/**
 * @fileoverview Unit tests for the InvoiceContext consumer hook guard.
 * @module app/domains/invoices/view-invoice/[id]/_context/InvoiceContext.test
 */

import {act, render, screen} from "@testing-library/react";
import {Component, type ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
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

  it("exposes the provided invoice and merchant and lets consumers replace the invoice", () => {
    const first = TestDataBuilder.build("invoice", {id: "invoice-1", name: "First"});
    const second = TestDataBuilder.build("invoice", {id: "invoice-1", name: "Second"});
    let replace: ((invoice: typeof first) => void) | null = null;

    function Consumer(): React.JSX.Element {
      const {invoice, merchant, setInvoice} = useInvoiceContext();
      replace = setInvoice;
      return (
        <p>
          {invoice.name}|{merchant === null ? "no-merchant" : "merchant"}
        </p>
      );
    }

    render(
      <InvoiceContextProvider
        invoice={first}
        merchant={null}>
        <Consumer />
      </InvoiceContextProvider>,
    );
    expect(screen.getByText("First|no-merchant")).toBeInTheDocument();

    act(() => replace?.(second));

    expect(screen.getByText("Second|no-merchant")).toBeInTheDocument();
    expect(screen.queryByText("First|no-merchant")).not.toBeInTheDocument();
  });
});
