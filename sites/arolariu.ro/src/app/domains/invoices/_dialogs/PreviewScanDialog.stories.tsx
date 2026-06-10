import type {Meta, StoryObj} from "@storybook/react";
import PreviewScanDialog from "./PreviewScanDialog";
import {OpenDialogOnMount, storyCachedImageScan, storyCachedPdfScan} from "../_storybook";

/**
 * PreviewScanDialog displays a full-screen preview of a scan (image or PDF)
 * in a modal dialog with optimized rendering for each content type.
 *
 * This story mounts the real component wrapped in `OpenDialogOnMount` with
 * `SHARED__SCAN_PREVIEW` dialog context seeded with fixture data.
 */
const meta = {
  title: "Invoices/Dialogs/PreviewScanDialog",
  component: PreviewScanDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PreviewScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Image preview dialog showing a JPEG scan. */
export const ImagePreview: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__SCAN_PREVIEW"
      mode="view"
      payload={{scan: storyCachedImageScan}}>
      <PreviewScanDialog />
    </OpenDialogOnMount>
  ),
};

/** PDF preview dialog showing a PDF scan with browser-native viewer. */
export const PdfPreview: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__SCAN_PREVIEW"
      mode="view"
      payload={{scan: storyCachedPdfScan}}>
      <PreviewScanDialog />
    </OpenDialogOnMount>
  ),
};
