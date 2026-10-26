import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import DialogContainer from "./DialogContainer";
import {DialogProvider, useDialogs} from "./DialogContext";

type OpenDialogFn = ReturnType<typeof useDialogs>["openDialog"];

/**
 * Dispatches one `openDialog(...)` call on mount using the real `useDialogs`
 * dispatcher, mirroring how a trigger button (e.g. "Delete" in
 * `TableViewActions`) opens a dialog in production.
 */
function OpenDialogHarness({
  dispatch,
  children,
}: Readonly<{dispatch: (openDialog: OpenDialogFn) => void; children: React.ReactNode}>): React.JSX.Element {
  const {openDialog} = useDialogs();

  useEffect(() => {
    dispatch(openDialog);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispatch once on mount, mirrors a single trigger click
  }, []);

  return <>{children}</>;
}

/** Builds a per-story decorator that opens one dialog type before the container renders. */
function withOpenDialog(dispatch: (openDialog: OpenDialogFn) => void): Decorator {
  return (Story) => (
    <OpenDialogHarness dispatch={dispatch}>
      <Story />
    </OpenDialogHarness>
  );
}

const sampleInvoice: Invoice = new InvoiceBuilder().withName("Weekly Groceries").build();

/**
 * DialogContainer is the registry/lazy-loading orchestrator for all 22
 * invoice-domain dialogs. It reads `currentDialog.type` from `useDialogs`
 * and renders the matching lazily-imported dialog component, or `null` when
 * no dialog is active.
 *
 * These stories exercise the real dynamic-import wiring for a representative
 * subset of dialog types (rather than a static schematic list) by dispatching
 * real `openDialog(...)` calls through the real `DialogProvider` context.
 */
const meta = {
  title: "Invoices/Dialogs/DialogContainer",
  component: DialogContainer,
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DialogContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No dialog open — the container renders `null`. */
export const Closed: Story = {};

/** Container renders the real, lazily-imported `DeleteInvoiceDialog` once `SHARED__INVOICE_DELETE` is active. */
export const DeleteInvoice: Story = {
  decorators: [withOpenDialog((openDialog) => openDialog("SHARED__INVOICE_DELETE", "delete", {invoice: sampleInvoice}))],
};

/** Container renders the real, lazily-imported `ShareInvoiceDialog` once `SHARED__INVOICE_SHARE` is active. */
export const ShareInvoice: Story = {
  decorators: [withOpenDialog((openDialog) => openDialog("SHARED__INVOICE_SHARE", "share", {invoice: sampleInvoice}))],
};
