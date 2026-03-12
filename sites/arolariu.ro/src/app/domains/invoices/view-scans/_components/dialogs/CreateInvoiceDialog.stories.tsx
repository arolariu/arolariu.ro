import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import CreateInvoiceDialog from "./CreateInvoiceDialog";

/**
 * CreateInvoiceDialog renders the invoice creation wizard's selection step.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/ViewScans/Dialogs/CreateInvoiceDialog",
  component: CreateInvoiceDialog,
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
} satisfies Meta<typeof CreateInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default create invoice dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
