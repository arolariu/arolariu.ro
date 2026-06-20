import {OpenDialogButton, playOpenDialog, storyInvoice} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import MetadataDialog from "./MetadataDialog";

/**
 * MetadataDialog edits invoice key-value metadata. It reads its
 * `Record<string, string>` payload from `useDialog("EDIT_INVOICE__METADATA")`.
 * Mounts the real dialog via the OpenDialogButton harness, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/EditMetadata",
  component: MetadataDialog,
  parameters: {layout: "centered"},
} satisfies Meta<typeof MetadataDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Metadata dialog opened on an invoice with existing metadata entries. */
export const EditMetadata: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__METADATA'
      mode='edit'
      payload={storyInvoice.additionalMetadata}>
      <MetadataDialog />
    </OpenDialogButton>
  ),
};

/** Metadata dialog opened with an empty metadata record. */
export const Empty: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__METADATA'
      mode='edit'
      payload={{}}>
      <MetadataDialog />
    </OpenDialogButton>
  ),
};

/** Metadata dialog with many metadata entries. */
export const ManyEntries: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__METADATA'
      mode='edit'
      payload={{
        "Payment Method": "Credit Card",
        "Transaction ID": "TRX-2024-001234",
        "Store Location": "Downtown Branch",
        "Cashier ID": "CSH-42",
        "Terminal Number": "T-05",
        "Receipt Number": "R-987654",
      }}>
      <MetadataDialog />
    </OpenDialogButton>
  ),
};

/** Metadata dialog with single entry. */
export const SingleEntry: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__METADATA'
      mode='edit'
      payload={{"Order ID": "ORD-123456"}}>
      <MetadataDialog />
    </OpenDialogButton>
  ),
};

/** Metadata dialog with long values. */
export const LongValues: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__METADATA'
      mode='edit'
      payload={{
        "Customer Notes":
          "This is an extremely long customer note that contains detailed instructions and special requests that need to be preserved for future reference and audit purposes",
        "Delivery Instructions":
          "Please deliver to the back entrance of the building located at the corner of Main Street and Second Avenue during business hours only",
      }}>
      <MetadataDialog />
    </OpenDialogButton>
  ),
};

/** Metadata dialog with standard invoice metadata. */
export const StandardMetadata: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__METADATA'
      mode='edit'
      payload={storyInvoice.additionalMetadata}>
      <MetadataDialog />
    </OpenDialogButton>
  ),
};
