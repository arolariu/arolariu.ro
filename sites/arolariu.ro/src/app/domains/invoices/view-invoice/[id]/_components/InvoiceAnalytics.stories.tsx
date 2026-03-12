import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {faker} from "@faker-js/faker";
import {InvoiceContextProvider} from "../_context/InvoiceContext";
import {InvoiceAnalytics} from "./InvoiceAnalytics";

faker.seed(42);

const mockInvoice = generateRandomInvoice();
const mockMerchant = generateRandomMerchant();

/**
 * InvoiceAnalytics renders spending analytics with charts and stats.
 * Requires InvoiceContextProvider for invoice/merchant data and
 * `useUserInformation` for ownership checks.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceAnalytics",
  component: InvoiceAnalytics,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <InvoiceContextProvider
        invoice={mockInvoice}
        merchant={mockMerchant}>
        <div className='max-w-5xl p-4'>
          <Story />
        </div>
      </InvoiceContextProvider>
    ),
  ],
} satisfies Meta<typeof InvoiceAnalytics>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics dashboard with mock invoice data. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
