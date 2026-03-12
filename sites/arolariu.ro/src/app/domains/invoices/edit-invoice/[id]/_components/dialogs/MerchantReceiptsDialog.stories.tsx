import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../../_contexts/DialogContext";
import InvoiceMerchantReceiptsDialog from "./MerchantReceiptsDialog";

/**
 * MerchantReceiptsDialog renders a table of receipts from a merchant.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantReceiptsDialog",
  component: InvoiceMerchantReceiptsDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div className='max-w-4xl p-4'>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof InvoiceMerchantReceiptsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default merchant receipts dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
