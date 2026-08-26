import {InvoiceBuilder} from "@/data/mocks";
import {useInvoicesStore} from "@/stores";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../_contexts/DialogContext";
import ExportDialog from "./ExportDialog";

/**
 * Seeds the real `useInvoicesStore` with sample invoices and opens the real
 * `VIEW_INVOICES__EXPORT` dialog on mount, mirroring the exact `useDialog`
 * call `InvoicesHeader` makes when a user clicks the "Export" button.
 */
function ExportDialogHarness(): null {
  const {open} = useDialog("VIEW_INVOICES__EXPORT");

  useEffect(() => {
    useInvoicesStore.getState().setEntities(Array.from({length: 5}, () => new InvoiceBuilder().build()));
    open();

    return () => {
      useInvoicesStore.getState().clearEntities();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per story mount, mirrors a single "Export" click
  }, []);

  return null;
}

/**
 * Wraps the story in the real `DialogProvider` context and opens the export
 * dialog via the harness above.
 */
const withOpenExportDialog: Decorator = (Story) => (
  <DialogProvider>
    <ExportDialogHarness />
    <Story />
  </DialogProvider>
);

/**
 * ExportDialog lets users export their invoices as CSV, JSON, or PDF with
 * configurable options (metadata, products, merchant, headers).
 *
 * Mounted as the real production component. The dialog reads its invoices
 * from the real `useInvoicesStore` Zustand store (seeded with `InvoiceBuilder`
 * fixtures) and its open state from the real `DialogProvider` context — no
 * mocking involved.
 */
const meta = {
  title: "Invoices/ViewInvoices/Dialogs/ExportDialog",
  component: ExportDialog,
  decorators: [withOpenExportDialog],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default export dialog, open, seeded with 5 sample invoices in the store. */
export const Default: Story = {};
