import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../_contexts/DialogContext";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";

/**
 * DeleteInvoiceDialog renders a confirmation dialog for invoice deletion.
 * Requires DialogProvider context to manage open/close state.
 * The dialog will not be visible by default since `useDialog` state starts closed.
 */
const meta = {
  title: "Invoices/Dialogs/DeleteInvoiceDialog",
  component: DeleteInvoiceDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div className='max-w-lg p-4'>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof DeleteInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default delete confirmation dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
