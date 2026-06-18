import type {Meta, StoryObj} from "@storybook/react";
import {
  OpenDialogButton,
  playOpenDialog,
  storyEmptyInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyLongNameInvoice,
  storyMerchant,
  storyMinimalMerchant,
  WithViewInvoiceContext,
} from "../../../_storybook";
import {ExportDialog} from "./ExportDialog";

/**
 * Export dialog for single invoice detail view.
 *
 * @remarks
 * **Features:**
 * - Export as PDF (professional invoice document)
 * - Export as CSV (product items)
 * - Export as JSON (full invoice data)
 * - Copy summary to clipboard
 *
 * **Dialog Context:**
 * Uses `VIEW_INVOICE__EXPORT` dialog with mode `view`.
 * Requires `InvoiceContext` to access invoice and merchant data.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/ExportDetail",
  component: ExportDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Export dialog for single invoice.
 *
 * @remarks
 * Wraps with `WithViewInvoiceContext` to provide invoice and merchant data.
 * Opens dialog automatically on mount in `view` mode.
 */
export const Default: Story = {
  play: playOpenDialog,
  render: () => (
    <WithViewInvoiceContext
      invoice={storyInvoice}
      merchant={storyMerchant}>
      <OpenDialogButton
        dialog='VIEW_INVOICE__EXPORT'
        mode='view'>
        <ExportDialog />
      </OpenDialogButton>
    </WithViewInvoiceContext>
  ),
};

/** Export dialog for an empty invoice. */
export const EmptyInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <WithViewInvoiceContext
      invoice={storyEmptyInvoice}
      merchant={storyMerchant}>
      <OpenDialogButton
        dialog='VIEW_INVOICE__EXPORT'
        mode='view'>
        <ExportDialog />
      </OpenDialogButton>
    </WithViewInvoiceContext>
  ),
};

/** Export dialog for invoice with long name. */
export const LongInvoiceName: Story = {
  play: playOpenDialog,
  render: () => (
    <WithViewInvoiceContext
      invoice={storyLongNameInvoice}
      merchant={storyMerchant}>
      <OpenDialogButton
        dialog='VIEW_INVOICE__EXPORT'
        mode='view'>
        <ExportDialog />
      </OpenDialogButton>
    </WithViewInvoiceContext>
  ),
};

/** Export dialog for huge invoice with many items. */
export const HugeInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <WithViewInvoiceContext
      invoice={storyHugeInvoice}
      merchant={storyMerchant}>
      <OpenDialogButton
        dialog='VIEW_INVOICE__EXPORT'
        mode='view'>
        <ExportDialog />
      </OpenDialogButton>
    </WithViewInvoiceContext>
  ),
};

/** Export dialog for invoice with minimal merchant. */
export const MinimalMerchant: Story = {
  play: playOpenDialog,
  render: () => (
    <WithViewInvoiceContext
      invoice={storyInvoice}
      merchant={storyMinimalMerchant}>
      <OpenDialogButton
        dialog='VIEW_INVOICE__EXPORT'
        mode='view'>
        <ExportDialog />
      </OpenDialogButton>
    </WithViewInvoiceContext>
  ),
};
