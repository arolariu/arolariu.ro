import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import MetadataDialog from "./MetadataDialog";

/**
 * MetadataDialog is a multi-mode dialog (add/edit/delete) for managing
 * invoice metadata key-value pairs.
 *
 * @remarks
 * The rendered variant is driven entirely by `DialogContext`'s current
 * `mode`, so each story opens `EDIT_INVOICE__METADATA` on mount in the
 * relevant mode via a small harness component sharing the same
 * `DialogProvider`.
 *
 * @see {@link VALID_METADATA_KEYS} for the predefined metadata key definitions
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MetadataDialog",
  component: MetadataDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MetadataDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMetadata: Record<string, string> = {key: "paymentMethod", value: "Credit Card"};

/** Opens `EDIT_INVOICE__METADATA` on mount in the requested mode/payload. */
function MetadataDialogOpener({mode, payload}: Readonly<{mode: "add" | "edit" | "delete"; payload?: Record<string, string>}>): null {
  const {open} = useDialog("EDIT_INVOICE__METADATA", mode, payload);

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Add mode — empty key/value form. */
export const AddMetadata: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <MetadataDialogOpener mode='add' />
        <Story />
      </DialogProvider>
    ),
  ],
};

/** Edit mode — pre-filled with an existing metadata entry. */
export const EditMetadata: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <MetadataDialogOpener
          mode='edit'
          payload={mockMetadata}
        />
        <Story />
      </DialogProvider>
    ),
  ],
};

/** Delete mode — confirmation dialog for removing a metadata entry. */
export const DeleteMetadata: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <MetadataDialogOpener
          mode='delete'
          payload={mockMetadata}
        />
        <Story />
      </DialogProvider>
    ),
  ],
};
