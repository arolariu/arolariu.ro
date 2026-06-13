import type {Meta, StoryObj} from "@storybook/react";
import PreviewScanDialog from "./PreviewScanDialog";
import {OpenDialogButton, playOpenDialog, storyCachedImageScan, storyCachedPdfScan} from "../_storybook";

/**
 * PreviewScanDialog displays a full-screen preview of a scan (image or PDF)
 * in a modal dialog with optimized rendering for each content type.
 *
 * This story mounts the real component wrapped in `OpenDialogButton` with
 * `SHARED__SCAN_PREVIEW` dialog context seeded with fixture data.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Scan/PreviewScan",
  component: PreviewScanDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PreviewScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Image preview dialog showing a JPEG scan. */
export const ImagePreview: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog="SHARED__SCAN_PREVIEW"
      mode="view"
      payload={{scan: storyCachedImageScan}}>
      <PreviewScanDialog />
    </OpenDialogButton>
  ),
};

/** PDF preview dialog showing a PDF scan with browser-native viewer. */
export const PdfPreview: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog="SHARED__SCAN_PREVIEW"
      mode="view"
      payload={{scan: storyCachedPdfScan}}>
      <PreviewScanDialog />
    </OpenDialogButton>
  ),
};
