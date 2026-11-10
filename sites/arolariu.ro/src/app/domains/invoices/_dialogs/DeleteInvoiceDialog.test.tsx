/**
 * @fileoverview Unit tests for DeleteInvoiceDialog.
 * @module app/domains/invoices/_dialogs/DeleteInvoiceDialog.test
 *
 * @remarks
 * Guards the v3 component-library contract: the acknowledgement Checkbox renders a `<span>` plus a hidden
 * input, so it must stay keyboard-operable and associated with its `<Label>` (a bare `nativeButton` breaks both).
 */

import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import type {Invoice} from "@/types/invoices";
import {TestDataBuilder} from "../../../../../tests/helpers";
import {deleteInvoice} from "../_actions/invoices";
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

function OpenDeleteDialog({invoice}: Readonly<{invoice: Invoice}>): React.JSX.Element {
  const {openDialog} = useDialogs();
  return (
    <>
      <button
        type='button'
        onClick={() => openDialog("SHARED__INVOICE_DELETE", "delete", {invoice})}>
        Open
      </button>
      <DeleteInvoiceDialog />
    </>
  );
}

async function openDialog(invoice: Invoice = TEST_INVOICE): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(
    <DialogProvider>
      <OpenDeleteDialog invoice={invoice} />
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

  it("shows the deleting state and blocks Escape while the deletion is in flight", async () => {
    // Arrange
    let resolveDelete: (value: Awaited<ReturnType<typeof deleteInvoice>>) => void = () => undefined;
    vi.mocked(deleteInvoice).mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const user = await openDialog();
    await user.click(screen.getByRole("checkbox"));

    // Act
    await user.click(getDeleteButton());

    // Assert
    expect(deleteInvoice).toHaveBeenCalledTimes(1);
    expect(deleteInvoice).toHaveBeenCalledWith({invoiceId: TEST_INVOICE.id});
    expect(screen.getByText(/deleting\.title/i)).toBeInTheDocument();
    expect(screen.getByText(/deleting\.description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /buttons\.deleting/i})).toBeDisabled();
    expect(screen.queryByRole("button", {name: /buttons\.deletePermanently/i})).not.toBeInTheDocument();

    // Act: Escape while deleting must not close
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Cleanup the pending promise inside act
    await act(async () => {
      resolveDelete({success: false, error: {code: "SERVER_ERROR", message: "boom"}});
      await Promise.resolve();
    });
  });

  it("closes the dialog on Escape while idle", async () => {
    // Arrange
    const user = await openDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteInvoice).not.toHaveBeenCalled();
  });

  it("resets the acknowledgement checkbox when Cancel closes the dialog", async () => {
    // Arrange
    const user = await openDialog();
    await user.click(screen.getByRole("checkbox"));
    expect(getDeleteButton()).toBeEnabled();

    // Act
    await user.click(screen.getByRole("button", {name: /buttons\.cancel/i}));
    await user.click(screen.getByRole("button", {name: "Open"}));

    // Assert
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(getDeleteButton()).toBeDisabled();
  });

  it("shows the invoice description when present", async () => {
    // Arrange
    const described = TestDataBuilder.build("invoice", {name: "Groceries", description: "Weekly shop"});

    // Act
    await openDialog(described);

    // Assert
    expect(screen.getByText("Weekly shop")).toBeInTheDocument();
    expect(screen.getByText(described.id).nextElementSibling).toHaveTextContent("Weekly shop");
  });

  it("renders the invoice summary without a description paragraph when the description is empty", async () => {
    // Arrange
    const invoice = TestDataBuilder.build("invoice", {name: "Groceries", description: ""});

    // Act
    await openDialog(invoice);

    // Assert
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText(invoice.id).nextElementSibling).toBeNull();
  });

  it("lists the shared-access impact when the invoice is shared", async () => {
    // Arrange & Act
    await openDialog(TestDataBuilder.build("invoice", {name: "Groceries", sharedWith: ["user-x"]}));

    // Assert
    expect(screen.getByText(/impact\.sharedAccess/i)).toBeInTheDocument();
  });

  it("does not list the shared-access impact for an unshared invoice", async () => {
    // Arrange & Act
    await openDialog(TestDataBuilder.build("invoice", {name: "Groceries", sharedWith: []}));

    // Assert
    expect(screen.getByText(/impact\.invoiceRecord/i)).toBeInTheDocument();
    expect(screen.queryByText(/impact\.sharedAccess/i)).not.toBeInTheDocument();
  });
});
