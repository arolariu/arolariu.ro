import {
  OpenDialogButton,
  playOpenDialog,
  storyInvoice,
  storyLongNameMerchant,
  storyMerchant,
  storyMinimalMerchant,
  storyOnlineInvoice,
  storyOnlineMerchant,
} from "@/app/domains/invoices/_storybook";
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

/** Feedback dialog with online merchant context. */
export const OnlineMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__FEEDBACK'
      mode='add'
      payload={{invoice: storyOnlineInvoice, merchant: storyOnlineMerchant}}>
      <FeedbackDialog />
    </OpenDialogButton>
  ),
};

/** Feedback dialog with null merchant. */
export const NoMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__FEEDBACK'
      mode='add'
      payload={{invoice: storyInvoice, merchant: null}}>
      <FeedbackDialog />
    </OpenDialogButton>
  ),
};

/** Feedback dialog with long-name merchant. */
export const LongNameMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__FEEDBACK'
      mode='add'
      payload={{invoice: storyInvoice, merchant: storyLongNameMerchant}}>
      <FeedbackDialog />
    </OpenDialogButton>
  ),
};

/** Feedback dialog with minimal merchant. */
export const MinimalMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__FEEDBACK'
      mode='add'
      payload={{invoice: storyInvoice, merchant: storyMinimalMerchant}}>
      <FeedbackDialog />
    </OpenDialogButton>
  ),
};
