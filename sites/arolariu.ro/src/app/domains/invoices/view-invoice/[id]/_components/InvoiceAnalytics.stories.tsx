import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../.storybook/providers";
import {InvoiceAnalytics} from "./InvoiceAnalytics";

/**
 * InvoiceAnalytics renders the analytics dashboard with summary stats,
 * category breakdown, price distribution, and (for the invoice owner)
 * comparison analytics against cached invoices. Reads the invoice via
 * `useInvoiceContext`, the authenticated user via the real
 * `useUserInformation` hook (falls back to the guest/nil-UUID identity when
 * `/api/user` is unreachable in Storybook), and cached invoices via the real
 * `useInvoicesStore` (empty by default).
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
  title: "Invoices/ViewInvoice/InvoiceAnalytics",
  component: InvoiceAnalytics,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceAnalytics>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Owner view — `userIdentifier` matches the guest/nil UUID that
 * `useUserInformation` falls back to, so the "Compare" tab is also shown.
 */
export const OwnerView: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withUserIdentifier("00000000-0000-0000-0000-000000000000").withRandomItems(8).build())],
};

/** Guest view — invoice belongs to a different user, so only the "Current" tab is shown. */
export const GuestView: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withRandomItems(6).build())],
};
