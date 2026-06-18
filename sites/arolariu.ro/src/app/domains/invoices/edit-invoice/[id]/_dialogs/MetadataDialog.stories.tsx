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
