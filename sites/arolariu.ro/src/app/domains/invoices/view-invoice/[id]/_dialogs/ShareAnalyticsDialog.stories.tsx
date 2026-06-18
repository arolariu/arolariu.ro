import {
  OpenDialogButton,
  playOpenDialog,
  storyEmptyInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyManyAllergensInvoice,
  storyMerchant,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import ShareAnalyticsDialog from "./ShareAnalyticsDialog";

/**
 * ShareAnalyticsDialog shares spending analytics via image or email. It reads its
 * `{invoice, merchant}` payload from `useDialog("VIEW_INVOICE__SHARE_ANALYTICS")`.
 * Mounts the real dialog via the OpenDialogButton harness, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/ShareAnalytics",
  component: ShareAnalyticsDialog,
  parameters: {layout: "centered"},
} satisfies Meta<typeof ShareAnalyticsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dialog opened with a standard invoice + merchant payload. */
export const Default: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICE__SHARE_ANALYTICS'
      mode='share'
      payload={{invoice: storyInvoice, merchant: storyMerchant}}>
      <ShareAnalyticsDialog />
    </OpenDialogButton>
  ),
};

/** Share analytics dialog with an empty invoice (no items). */
export const EmptyInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICE__SHARE_ANALYTICS'
      mode='share'
      payload={{invoice: storyEmptyInvoice, merchant: storyMerchant}}>
      <ShareAnalyticsDialog />
    </OpenDialogButton>
  ),
};

/** Share analytics dialog with null merchant. */
export const NoMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICE__SHARE_ANALYTICS'
      mode='share'
      payload={{invoice: storyInvoice, merchant: null}}>
      <ShareAnalyticsDialog />
    </OpenDialogButton>
  ),
};

/** Share analytics dialog with huge invoice. */
export const HugeInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICE__SHARE_ANALYTICS'
      mode='share'
      payload={{invoice: storyHugeInvoice, merchant: storyMerchant}}>
      <ShareAnalyticsDialog />
    </OpenDialogButton>
  ),
};

/** Share analytics dialog with many allergens invoice. */
export const ManyAllergensInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICE__SHARE_ANALYTICS'
      mode='share'
      payload={{invoice: storyManyAllergensInvoice, merchant: storyMerchant}}>
      <ShareAnalyticsDialog />
    </OpenDialogButton>
  ),
};
