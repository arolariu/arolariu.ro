import {
  OpenDialogButton,
  playOpenDialog,
  storyEmptyInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyLongNameInvoice,
  storyManyAllergensInvoice,
  storySoftDeletedItemsInvoice,
  storyZeroPriceItemsInvoice,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import ItemsDialog from "./ItemsDialog";

/**
 * ItemsDialog edits an invoice's product line items. It reads its Invoice payload
 * from `useDialog("EDIT_INVOICE__ITEMS")`. Mounts the real dialog via the
 * OpenDialogButton harness, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Products/EditItems",
  component: ItemsDialog,
  parameters: {layout: "centered"},
} satisfies Meta<typeof ItemsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Items dialog opened on an invoice with several products. */
export const WithItems: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storyInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};

/** Items dialog opened on an invoice with no products — empty state. */
export const Empty: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storyEmptyInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};

/** Items dialog opened on an invoice with many products (huge list). */
export const HugeList: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storyHugeInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};

/** Items dialog with a long invoice name (tests header truncation). */
export const LongInvoiceName: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storyLongNameInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};

/** Items dialog with soft-deleted items invoice. */
export const SoftDeletedItems: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storySoftDeletedItemsInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};

/** Items dialog with many allergens invoice. */
export const ManyAllergensInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storyManyAllergensInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};

/** Items dialog with zero-price items invoice. */
export const ZeroPriceItems: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ITEMS'
      mode='edit'
      payload={storyZeroPriceItemsInvoice}>
      <ItemsDialog />
    </OpenDialogButton>
  ),
};
