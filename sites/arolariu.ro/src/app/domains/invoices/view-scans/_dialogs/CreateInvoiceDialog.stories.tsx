import {
  OpenDialogButton,
  playOpenDialog,
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyCachedImageScan,
  storyCachedPdfScan,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import CreateInvoiceDialog from "./CreateInvoiceDialog";

/**
 * CreateInvoiceDialog is the wizard for creating invoices from selected scans.
 * It reads its `{selectedScans}` payload from `useDialog("VIEW_SCANS__CREATE_INVOICE")`
 * and the scans/invoices stores. Mounts the real dialog via the OpenDialogButton
 * harness with seeded stores, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Scan/CreateInvoice",
  component: CreateInvoiceDialog,
  parameters: {layout: "centered"},
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores();
      return <Story />;
    },
  ],
} satisfies Meta<typeof CreateInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Create-invoice wizard opened with two selected scans. */
export const WithSelectedScans: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_SCANS__CREATE_INVOICE'
      mode='add'
      payload={{selectedScans: [storyCachedImageScan, storyCachedPdfScan]}}>
      <CreateInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Create-invoice wizard opened with a single selected scan. */
export const SingleScan: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_SCANS__CREATE_INVOICE'
      mode='add'
      payload={{selectedScans: [storyCachedImageScan]}}>
      <CreateInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Create-invoice wizard with a PDF scan. */
export const PdfScan: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_SCANS__CREATE_INVOICE'
      mode='add'
      payload={{selectedScans: [storyCachedPdfScan]}}>
      <CreateInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Create-invoice wizard with mixed scan types. */
export const MixedScans: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_SCANS__CREATE_INVOICE'
      mode='add'
      payload={{selectedScans: [storyCachedImageScan, storyCachedPdfScan, storyCachedImageScan]}}>
      <CreateInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Create-invoice wizard with many selected scans. */
export const ManyScans: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_SCANS__CREATE_INVOICE'
      mode='add'
      payload={{selectedScans: [storyCachedImageScan, storyCachedPdfScan, storyCachedImageScan, storyCachedPdfScan, storyCachedImageScan]}}>
      <CreateInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Create-invoice wizard with image scan only. */
export const ImageScanOnly: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_SCANS__CREATE_INVOICE'
      mode='add'
      payload={{selectedScans: [storyCachedImageScan]}}>
      <CreateInvoiceDialog />
    </OpenDialogButton>
  ),
};
