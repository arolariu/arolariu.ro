import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Invoice, Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import FeedbackDialog from "./FeedbackDialog";

/**
 * FeedbackDialog collects a star rating, feature selection, and free-form
 * comments for an invoice's analytics experience.
 *
 * The dialog reads `{invoice, merchant}` from `DialogContext` payload rather
 * than props, so this story opens the `EDIT_INVOICE__FEEDBACK` dialog on
 * mount via a small harness component that shares the same `DialogProvider`.
 * The component itself is null-safe: mounting it before `open()` runs (the
 * very first Storybook render) no longer crashes, matching the guard added
 * to the production component.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/FeedbackDialog",
  component: FeedbackDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoice: Invoice = generateRandomInvoice();
const mockMerchant: Merchant = generateRandomMerchant();

/** Opens `EDIT_INVOICE__FEEDBACK` on mount so the dialog renders already visible. */
function FeedbackDialogOpener({invoice, merchant}: Readonly<{invoice: Invoice; merchant: Merchant | null}>): null {
  const {open} = useDialog("EDIT_INVOICE__FEEDBACK", "add", {invoice, merchant});

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Default feedback dialog bound to a merchant. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <FeedbackDialogOpener
          invoice={mockInvoice}
          merchant={mockMerchant}
        />
        <Story />
      </DialogProvider>
    ),
  ],
};

/** Feedback dialog with no merchant attached to the invoice. */
export const NoMerchant: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <FeedbackDialogOpener
          invoice={mockInvoice}
          merchant={null}
        />
        <Story />
      </DialogProvider>
    ),
  ],
};
