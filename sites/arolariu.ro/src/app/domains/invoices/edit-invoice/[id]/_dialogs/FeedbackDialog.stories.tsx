import {OpenDialogButton, playOpenDialog, storyInvoice, storyMerchant} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import FeedbackDialog from "./FeedbackDialog";

/**
 * FeedbackDialog collects user feedback about an invoice analysis. It reads its
 * `{invoice, merchant}` payload from `useDialog("EDIT_INVOICE__FEEDBACK")`.
 * Mounts the real dialog via the OpenDialogButton harness, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/Feedback",
  component: FeedbackDialog,
  parameters: {layout: "centered"},
} satisfies Meta<typeof FeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Feedback dialog opened with a standard invoice + merchant payload. */
export const Default: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__FEEDBACK'
      mode='add'
      payload={{invoice: storyInvoice, merchant: storyMerchant}}>
      <FeedbackDialog />
    </OpenDialogButton>
  ),
};
