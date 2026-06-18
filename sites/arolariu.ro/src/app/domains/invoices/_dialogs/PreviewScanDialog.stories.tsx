import type {CachedScan} from "@/types/scans";
import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, scanPresets, storyCachedImageScan, storyCachedPdfScan, withEntityPreset} from "../_storybook";
import PreviewScanDialog from "./PreviewScanDialog";

type StoryArgs = {scan: CachedScan; scanPreset: "image" | "pdf"};

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
  argTypes: {
    scanPreset: {control: "select", options: ["image", "pdf"]},
    scan: {control: "object"},
  },
  args: {scanPreset: "image", scan: storyCachedImageScan},
  decorators: [withEntityPreset("scanPreset", "scan", scanPresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Image preview dialog showing a JPEG scan. */
export const ImagePreview: Story = {
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_PREVIEW'
      mode='view'
      payload={{scan}}>
      <PreviewScanDialog />
    </OpenDialogButton>
  ),
};

/** PDF preview dialog showing a PDF scan with browser-native viewer. */
export const PdfPreview: Story = {
  args: {scanPreset: "pdf", scan: storyCachedPdfScan},
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_PREVIEW'
      mode='view'
      payload={{scan}}>
      <PreviewScanDialog />
    </OpenDialogButton>
  ),
};

/** Image preview dialog with a different scan variation. */
export const ImagePreviewSecondary: Story = {
  args: {scanPreset: "image"},
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_PREVIEW'
      mode='view'
      payload={{scan: {...scan, id: "scan-preview-003", name: "Restaurant Bill"}}}>
      <PreviewScanDialog />
    </OpenDialogButton>
  ),
};
