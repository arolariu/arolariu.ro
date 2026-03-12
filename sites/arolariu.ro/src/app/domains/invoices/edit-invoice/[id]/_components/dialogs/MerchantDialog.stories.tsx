import type {Meta, StoryObj} from "@storybook/react";
import {withDialogProvider} from "../../../../../../../../.storybook/providers";
import InvoiceMerchantDialog from "./MerchantDialog";

/**
 * MerchantDialog renders merchant details view.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantDialog",
  component: InvoiceMerchantDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    withDialogProvider,
  ],
} satisfies Meta<typeof InvoiceMerchantDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default merchant details dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};
