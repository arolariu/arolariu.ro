import {OpenDialogButton, playOpenDialog, storyImageScanUrl} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import ImageDialog from "./ImageDialog";

/**
 * ImageDialog shows a full-size scan image. It reads its string image-URL payload
 * from `useDialog("EDIT_INVOICE__IMAGE")`. Mounts the real dialog via the
 * OpenDialogButton harness, opening it on mount.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Scan/Image",
  component: ImageDialog,
  parameters: {layout: "centered"},
} satisfies Meta<typeof ImageDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Image dialog opened with a sample scan image URL. */
export const Default: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__IMAGE'
      mode='view'
      payload={storyImageScanUrl}>
      <ImageDialog />
    </OpenDialogButton>
  ),
};
