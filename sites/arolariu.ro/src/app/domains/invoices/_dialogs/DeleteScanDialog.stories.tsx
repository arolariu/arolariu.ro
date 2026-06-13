import type {Meta, StoryObj} from "@storybook/react";
import type {CachedScan} from "@/types/scans";
import DeleteScanDialog from "./DeleteScanDialog";
import {
  OpenDialogButton,
  playOpenDialog,
  scanPresets,
  storyCachedImageScan,
  storyCachedPdfScan,
  withEntityPreset,
} from "../_storybook";

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
      dialog="SHARED__SCAN_DELETE"
      mode="delete"
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
      dialog="SHARED__SCAN_DELETE"
      mode="delete"
      payload={{scan}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};
