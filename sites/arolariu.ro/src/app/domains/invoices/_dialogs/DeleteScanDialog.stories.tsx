import type {Meta, StoryObj} from "@storybook/react";
import DeleteScanDialog from "./DeleteScanDialog";
import {OpenDialogOnMount, storyCachedImageScan} from "../_storybook";

/**
 * DeleteScanDialog displays a destructive confirmation dialog for permanently
 * removing a standalone scan and its associated Azure blob.
 *
 * This story mounts the real component wrapped in `OpenDialogOnMount` with
 * `SHARED__SCAN_DELETE` dialog context seeded with fixture data.
 */
const meta = {
  title: "Invoices/Dialogs/DeleteScanDialog",
  component: DeleteScanDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DeleteScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog for deleting a standalone scan. */
export const OpenConfirmation: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__SCAN_DELETE"
      mode="delete"
      payload={{scan: storyCachedImageScan}}>
      <DeleteScanDialog />
    </OpenDialogOnMount>
  ),
};
