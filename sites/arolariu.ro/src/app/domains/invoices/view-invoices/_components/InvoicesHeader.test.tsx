/**
 * @fileoverview Unit tests for the view-invoices page header and its action buttons.
 * @module app/domains/invoices/view-invoices/_components/InvoicesHeader.test
 *
 * @remarks
 * The header runs inside the real {@link DialogProvider}; a small probe reads the shared dialog state through the
 * public `useDialogs` hook so tests can assert which dialog an action opened. Only the browser `window.print`
 * boundary is spied.
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import {DialogProvider, useDialogs} from "../../_contexts/DialogContext";
import InvoicesHeader from "./InvoicesHeader";

const HEADER_KEY = "pages.invoices.viewInvoices.invoicesHeader";
const IMPORT_BUTTON = /invoicesHeader\.actions\.import$/u;
const EXPORT_BUTTON = /invoicesHeader\.actions\.export$/u;
const PRINT_BUTTON = /invoicesHeader\.actions\.print$/u;
const NEW_INVOICE_LINK = /invoicesHeader\.actions\.newInvoice$/u;

/** Exposes the currently open dialog type through the public dialog hook. */
function DialogProbe(): React.JSX.Element {
  const {currentDialog} = useDialogs();
  return <output data-testid='open-dialog'>{currentDialog.type ?? "none"}</output>;
}

function renderHeader(): void {
  render(
    <DialogProvider>
      <InvoicesHeader />
      <DialogProbe />
    </DialogProvider>,
  );
}

describe("InvoicesHeader", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion elements unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  let printSpy: Mock<() => void>;

  beforeEach(() => {
    // happy-dom does not implement `window.print`; install a spy at the browser boundary.
    printSpy = vi.fn<() => void>();
    vi.stubGlobal("print", printSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the translated title and description with no dialog open", () => {
    // Arrange & Act
    renderHeader();

    // Assert
    expect(screen.getByRole("heading", {level: 1, name: `${HEADER_KEY}.title`})).toBeInTheDocument();
    expect(screen.getByText(`${HEADER_KEY}.description`)).toBeInTheDocument();
    expect(screen.getByTestId("open-dialog")).toHaveTextContent("none");
  });

  it("opens the import dialog when the import action is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHeader();

    // Act
    await user.click(screen.getByRole("button", {name: IMPORT_BUTTON}));

    // Assert
    expect(screen.getByTestId("open-dialog")).toHaveTextContent("VIEW_INVOICES__IMPORT");
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("opens the export dialog when the export action is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHeader();

    // Act
    await user.click(screen.getByRole("button", {name: EXPORT_BUTTON}));

    // Assert
    expect(screen.getByTestId("open-dialog")).toHaveTextContent("VIEW_INVOICES__EXPORT");
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("opens the browser print dialog without opening an app dialog when the print action is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHeader();

    // Act
    await user.click(screen.getByRole("button", {name: PRINT_BUTTON}));

    // Assert
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("open-dialog")).toHaveTextContent("none");
  });

  it("links the new-invoice action to the create-invoice page", () => {
    // Arrange & Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", {name: NEW_INVOICE_LINK})).toHaveAttribute("href", "/domains/invoices/create-invoice");
  });
});
