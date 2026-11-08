/**
 * @fileoverview Unit tests for DeleteInvoiceDialog.
 * @module app/domains/invoices/_dialogs/DeleteInvoiceDialog.test
 *
 * @remarks
 * Guards the v3 component-library contract: the acknowledgement Checkbox renders a `<span>` plus a hidden
 * input, so it must stay keyboard-operable and associated with its `<Label>` (a bare `nativeButton` breaks both).
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {TestDataBuilder} from "../../../../../tests/helpers";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";

vi.mock("../_actions/invoices", () => ({
  deleteInvoice: vi.fn(),
}));

// happy-dom rejects canceled Web Animations on unmount; render motion elements as plain divs.
vi.mock("motion/react", () => ({
  AnimatePresence: ({children}: {children: ReactNode}) => <>{children}</>,
  motion: {div: ({children, className}: {children: ReactNode; className?: string}) => <div className={className}>{children}</div>},
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({push: vi.fn(), replace: vi.fn(), refresh: vi.fn()}),
}));

const TEST_INVOICE = TestDataBuilder.build("invoice", {name: "Groceries"});

function OpenDeleteDialog(): React.JSX.Element {
  const {openDialog} = useDialogs();
  return (
    <>
      <button
        type='button'
        onClick={() => openDialog("SHARED__INVOICE_DELETE", "delete", {invoice: TEST_INVOICE})}>
        Open
      </button>
      <DeleteInvoiceDialog />
    </>
  );
}

async function openDialog(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(
    <DialogProvider>
      <OpenDeleteDialog />
    </DialogProvider>,
  );
  await user.click(screen.getByRole("button", {name: "Open"}));
  return user;
}

function getDeleteButton(): HTMLElement {
  return screen.getByRole("button", {name: /buttons\.deletePermanently/i});
}

describe("DeleteInvoiceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables deletion when the acknowledgement checkbox is toggled with Space", async () => {
    // Arrange
    const user = await openDialog();
    const checkbox = screen.getByRole("checkbox");
    expect(getDeleteButton()).toBeDisabled();

    // Act
    checkbox.focus();
    await user.keyboard(" ");

    // Assert
    expect(checkbox).toBeChecked();
    expect(getDeleteButton()).toBeEnabled();
  });

  it("toggles the acknowledgement checkbox through its label", async () => {
    // Arrange
    const user = await openDialog();
    const checkbox = screen.getByRole("checkbox");

    // Act
    await user.click(screen.getByText(/confirmation\.understoodLabel/i));

    // Assert
    expect(checkbox).toBeChecked();
    expect(getDeleteButton()).toBeEnabled();
  });

  it("names the automatic close button with the localized label", async () => {
    // Arrange & Act
    await openDialog();

    // Assert
    expect(screen.getByRole("button", {name: /shared\.accessibility\.close/i})).toBeInTheDocument();
  });
});
