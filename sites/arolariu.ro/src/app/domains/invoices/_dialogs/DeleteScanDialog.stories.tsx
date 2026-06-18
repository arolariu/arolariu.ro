import type {CachedScan} from "@/types/scans";
import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, scanPresets, storyCachedImageScan, storyCachedPdfScan, withEntityPreset} from "../_storybook";
import DeleteScanDialog from "./DeleteScanDialog";

type StoryArgs = {scan: CachedScan; scanPreset: "image" | "pdf"};

/**
 * DeleteScanDialog displays a destructive confirmation dialog for permanently
 * removing a standalone scan and its associated Azure blob.
 *
 * This story mounts the real component wrapped in `OpenDialogButton` with
 * `SHARED__SCAN_DELETE` dialog context seeded with fixture data.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Scan/DeleteScan",
  component: DeleteScanDialog,
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

/** Confirmation dialog for deleting a standalone scan. */
export const OpenConfirmation: Story = {
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_DELETE'
      mode='delete'
      payload={{scan}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};

/** Confirmation dialog for deleting a standalone PDF scan. */
export const PdfScan: Story = {
  args: {scanPreset: "pdf", scan: storyCachedPdfScan},
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_DELETE'
      mode='delete'
      payload={{scan}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};

/** Confirmation dialog for deleting an image scan with different metadata. */
export const ImageScanVariant: Story = {
  args: {scanPreset: "image"},
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_DELETE'
      mode='delete'
      payload={{scan: {...scan, id: "scan-variant-002", name: "Grocery Receipt 2024"}}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};

/** Confirmation dialog for deleting a scan with long name. */
export const LongScanName: Story = {
  args: {scanPreset: "image"},
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_DELETE'
      mode='delete'
      payload={{
        scan: {
          ...scan,
          id: "scan-longname-001",
          name: "Annual Business Expense Receipt from Premium International Shopping Center Downtown District Branch Location Number 42",
        },
      }}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};

/** Confirmation dialog for deleting a PDF scan with custom name. */
export const CustomPdfScan: Story = {
  args: {scanPreset: "pdf"},
  play: playOpenDialog,
  render: ({scan}) => (
    <OpenDialogButton
      dialog='SHARED__SCAN_DELETE'
      mode='delete'
      payload={{scan: {...scan, id: "scan-custom-003", name: "Invoice_2024_Q1"}}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};
