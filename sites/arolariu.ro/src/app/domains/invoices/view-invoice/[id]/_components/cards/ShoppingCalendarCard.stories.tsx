import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {ShoppingCalendarCard} from "./ShoppingCalendarCard";

/**
 * ShoppingCalendarCard shows a calendar heat map of spending by day with
 * month statistics and shopping pattern insights. Reads the invoice via
 * `useInvoiceContext` and cached invoices via the real `useInvoicesStore`
 * (empty by default in Storybook, so the calendar falls back to computing
 * patterns from just the current invoice — the same behavior production
 * exhibits before the store has hydrated).
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
  title: "Invoices/ViewInvoice/Cards/ShoppingCalendar",
  component: ShoppingCalendarCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ShoppingCalendarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default calendar heat map for the invoice's transaction month. */
export const Default: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withTransactionDate(new Date(2025, 5, 12))
        .withRandomItems(6)
        .build(),
    ),
  ],
};

/** A transaction near the end of the month — exercises a different days-in-month layout. */
export const EndOfMonth: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withTransactionDate(new Date(2025, 0, 30))
        .withRandomItems(4)
        .build(),
    ),
  ],
};
