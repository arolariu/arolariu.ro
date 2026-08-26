import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../../.storybook/providers";
import {DiningCard} from "./DiningCard";

/**
 * DiningCard displays dining-related insights from restaurant/fast-food invoices,
 * including estimated calories, sodium level, and dining tips. Reads the invoice
 * via `useInvoiceContext`, so every story mounts the real component inside the
 * real `InvoiceContextProvider` re-exported from `.storybook/providers`.
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
  title: "Invoices/ViewInvoice/Insights/DiningCard",
  component: DiningCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DiningCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Low spend — sodium level estimate stays "low". */
export const LowSpend: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPaymentAmount(18).withRandomItems(2).build())],
};

/** Medium spend — sodium level estimate is "medium". */
export const MediumSpend: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPaymentAmount(38).withRandomItems(4).build())],
};

/** High spend — sodium level estimate is "high" and shows a warning marker. */
export const HighSpend: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPaymentAmount(65).withRandomItems(6).build())],
};
