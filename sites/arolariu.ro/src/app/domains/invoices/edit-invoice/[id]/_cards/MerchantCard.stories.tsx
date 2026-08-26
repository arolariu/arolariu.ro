import {generateRandomMerchant} from "@/data/mocks";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import MerchantCard from "./MerchantCard";

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * Requires `DialogProvider` because it dispatches `EDIT_INVOICE__MERCHANT`
 * and `EDIT_INVOICE__MERCHANT_INVOICES` dialogs.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Cards/MerchantCard",
  component: MerchantCard,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMerchant = generateRandomMerchant();

/** Merchant linked to the invoice. */
export const WithMerchant: Story = {
  args: {merchant: mockMerchant},
};

/** No merchant linked to the invoice. */
export const NoMerchant: Story = {
  args: {merchant: null},
};
