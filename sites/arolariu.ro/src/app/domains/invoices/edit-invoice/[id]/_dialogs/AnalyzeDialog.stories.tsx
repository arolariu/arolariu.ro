import {generateRandomInvoice} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import AnalyzeDialog from "./AnalyzeDialog";

/**
 * AnalyzeDialog configures and submits an invoice to the asynchronous
 * analysis pipeline.
 *
 * The dialog reads its invoice from `DialogContext` payload rather than
 * props, so this story opens the `EDIT_INVOICE__ANALYSIS` dialog on mount
 * via a small harness component that shares the same `DialogProvider`.
 * Only the idle/default state is exercised here — the "queued" and "error"
 * states depend on the real `analyzeInvoice` server action reaching a
 * backend that is not available in Storybook.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AnalyzeDialog",
  component: AnalyzeDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AnalyzeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoice: Invoice = generateRandomInvoice();

/** Opens `EDIT_INVOICE__ANALYSIS` on mount so the dialog renders already visible. */
function AnalyzeDialogOpener({invoice}: Readonly<{invoice: Invoice}>): null {
  const {open} = useDialog("EDIT_INVOICE__ANALYSIS", "view", {invoice});

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Idle state — analysis profile and capability controls are ready to submit. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <AnalyzeDialogOpener invoice={mockInvoice} />
        <Story />
      </DialogProvider>
    ),
  ],
};
