import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../../_contexts/DialogContext";
import AddScanDialog from "./AddScanDialog";

/**
 * AddScanDialog renders the scan upload dialog with a dropzone.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AddScanDialog",
  component: AddScanDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div className='max-w-md p-4'>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof AddScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default upload dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
