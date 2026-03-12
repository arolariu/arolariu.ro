import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../_contexts/DialogContext";
import ShareInvoiceDialog from "./ShareInvoiceDialog";

/**
 * ShareInvoiceDialog renders the initial sharing mode selection screen
 * (public vs private). Requires DialogProvider context.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialog",
  component: ShareInvoiceDialog,
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
} satisfies Meta<typeof ShareInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default sharing mode selection (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
