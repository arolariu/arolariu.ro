import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  invoicePresets,
  OpenDialogButton,
  playOpenDialog,
  storyEmptyInvoice,
  storyInvoice,
  storyLongNameInvoice,
  storyManyUpdatesInvoice,
  storySoftDeletedItemsInvoice,
  withEntityPreset,
} from "../../../_storybook";
import AddScanDialog from "./AddScanDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * AddScanDialog allows users to upload receipt scans to an invoice.
 *
 * @remarks
 * This story mounts the real AddScanDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice payload.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Scan/AddScan",
  component: AddScanDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default upload dialog with empty dropzone.
 */
export const Default: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ADD_SCAN'
      mode='add'
      payload={{invoice}}>
      <AddScanDialog />
    </OpenDialogButton>
  ),
};

/** Add scan dialog for an empty invoice (no existing scans). */
export const EmptyInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ADD_SCAN'
      mode='add'
      payload={{invoice: storyEmptyInvoice}}>
      <AddScanDialog />
    </OpenDialogButton>
  ),
};

/** Add scan dialog for a soft-deleted invoice. */
export const SoftDeletedInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ADD_SCAN'
      mode='add'
      payload={{invoice: storySoftDeletedItemsInvoice}}>
      <AddScanDialog />
    </OpenDialogButton>
  ),
};

/** Add scan dialog for an invoice with long name. */
export const LongInvoiceName: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ADD_SCAN'
      mode='add'
      payload={{invoice: storyLongNameInvoice}}>
      <AddScanDialog />
    </OpenDialogButton>
  ),
};

/** Add scan dialog for an invoice with many updates. */
export const ManyUpdates: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ADD_SCAN'
      mode='add'
      payload={{invoice: storyManyUpdatesInvoice}}>
      <AddScanDialog />
    </OpenDialogButton>
  ),
};
