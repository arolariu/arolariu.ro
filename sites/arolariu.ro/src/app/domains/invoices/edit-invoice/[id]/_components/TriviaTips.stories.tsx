import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import TriviaTipsCard from "./TriviaTips";

/**
 * TriviaTipsCard displays personalized savings tips based on merchant
 * and invoice data. It calculates potential savings as percentages of
 * the invoice total amount.
 */
const meta = {
  title: "Invoices/EditInvoice/TriviaTips",
  component: TriviaTipsCard,
  decorators: [
    (Story) => (
      <div className='max-w-lg'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TriviaTipsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMerchant = generateRandomMerchant();
const mockInvoice = generateRandomInvoice();

/** Default savings tips card with random mock data. */
export const Default: Story = {
  args: {
    merchant: mockMerchant,
    invoice: mockInvoice,
  },
};

/** Tips for a high-value invoice. */
export const HighValueInvoice: Story = {
  args: {
    merchant: {...mockMerchant, name: "Premium Grocery Store"},
    invoice: {
      ...mockInvoice,
      paymentInformation: {
        ...mockInvoice.paymentInformation,
        totalCostAmount: 250.75,
      },
    },
  },
};

/** Tips for a low-value invoice. */
export const LowValueInvoice: Story = {
  args: {
    merchant: {...mockMerchant, name: "Corner Shop"},
    invoice: {
      ...mockInvoice,
      paymentInformation: {
        ...mockInvoice.paymentInformation,
        totalCostAmount: 12.5,
      },
    },
  },
};
