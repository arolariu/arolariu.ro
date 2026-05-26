import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import InvoiceNotFound from "./not-found";

describe("view-invoice/[id]/not-found.tsx", () => {
  it("renders the invoice-scoped not-found message", () => {
    render(<InvoiceNotFound />);
    expect(screen.getByText("app.errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("app.errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("links back to the invoices listing", () => {
    render(<InvoiceNotFound />);
    const link = screen.getByRole("link", {name: "app.errors.notFound.buttons.returnButton"});
    expect(link).toHaveAttribute("href", "/domains/invoices/view-invoices");
  });
});
