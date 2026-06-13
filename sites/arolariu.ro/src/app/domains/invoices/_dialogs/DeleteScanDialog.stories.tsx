import type {Meta, StoryObj} from "@storybook/react";
import DeleteScanDialog from "./DeleteScanDialog";
import {OpenDialogButton, playOpenDialog, storyCachedImageScan, storyCachedPdfScan} from "../_storybook";

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
} satisfies Meta<typeof DeleteScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog for deleting a standalone scan. */
export const OpenConfirmation: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog="SHARED__SCAN_DELETE"
      mode="delete"
      payload={{scan: storyCachedImageScan}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};

/** Confirmation dialog for deleting a standalone PDF scan. */
export const PdfScan: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog="SHARED__SCAN_DELETE"
      mode="delete"
      payload={{scan: storyCachedPdfScan}}>
      <DeleteScanDialog />
    </OpenDialogButton>
  ),
};
