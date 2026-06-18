import {OpenDialogButton, playOpenDialog, storyMerchant, storyOnlineMerchant} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import MerchantReceiptsDialog from "./MerchantReceiptsDialog";

/**
 * MerchantReceiptsDialog lists all receipts for a merchant. It reads its Merchant
 * payload from `useDialog("EDIT_INVOICE__MERCHANT_INVOICES")`. Mounts the real
 * dialog via the OpenDialogButton harness, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Merchant/MerchantReceipts",
  component: MerchantReceiptsDialog,
  parameters: {layout: "centered"},
} satisfies Meta<typeof MerchantReceiptsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Merchant receipts dialog opened for a standard merchant. */
export const Default: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__MERCHANT_INVOICES'
      mode='view'
      payload={storyMerchant}>
      <MerchantReceiptsDialog />
    </OpenDialogButton>
  ),
};

/** Merchant receipts dialog for an online merchant. */
export const OnlineMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__MERCHANT_INVOICES'
      mode='view'
      payload={storyOnlineMerchant}>
      <MerchantReceiptsDialog />
    </OpenDialogButton>
  ),
};
