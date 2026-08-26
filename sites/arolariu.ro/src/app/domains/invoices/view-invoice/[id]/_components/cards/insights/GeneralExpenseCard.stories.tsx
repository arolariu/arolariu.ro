import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../../.storybook/providers";
import {GeneralExpenseCard} from "./GeneralExpenseCard";

/**
 * GeneralExpenseCard displays general expense insights including auto-detected
 * category, budget impact analysis, tax/business options, and similar past
 * purchases. Reads the invoice via `useInvoiceContext`, so every story mounts
 * the real component inside the real `InvoiceContextProvider` re-exported
 * from `.storybook/providers`.
 */
const mockMerchant = generateRandomMerchant();

function withInvoice(invoice: Invoice): Decorator {
  return (Story) => (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={mockMerchant}>
      <Story />
    </InvoiceContextProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/Insights/GeneralExpenseCard",
  component: GeneralExpenseCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof GeneralExpenseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default general expense insights for an unclassified/miscellaneous invoice. */
export const Default: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPaymentAmount(67.3).withPaymentCurrency("RON").withRandomItems(8).build())],
};
