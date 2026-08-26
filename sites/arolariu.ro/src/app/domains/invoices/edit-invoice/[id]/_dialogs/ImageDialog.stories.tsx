import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import ImageDialog from "./ImageDialog";

/**
 * ImageDialog renders a full-size view of a receipt scan image.
 *
 * The dialog reads its image URL from `DialogContext` payload rather than
 * props (and renders `null` while the payload is empty), so this story
 * opens the `EDIT_INVOICE__IMAGE` dialog on mount via a small harness
 * component that shares the same `DialogProvider`.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ImageDialog",
  component: ImageDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ImageDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockImageUrl = "https://picsum.photos/seed/imagedialog/600/800";

/** Opens `EDIT_INVOICE__IMAGE` on mount so the dialog renders already visible. */
function ImageDialogOpener({imageUrl}: Readonly<{imageUrl: string}>): null {
  const {open} = useDialog("EDIT_INVOICE__IMAGE", "view", imageUrl);

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Default image dialog showing a receipt scan at full size. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <ImageDialogOpener imageUrl={mockImageUrl} />
        <Story />
      </DialogProvider>
    ),
  ],
};
