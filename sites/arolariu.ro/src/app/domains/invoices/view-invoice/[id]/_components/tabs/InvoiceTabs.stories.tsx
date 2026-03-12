import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {faker} from "@faker-js/faker";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {InvoiceTabs} from "./InvoiceTabs";

faker.seed(42);

const mockInvoice = generateRandomInvoice();
const mockMerchant = generateRandomMerchant();

/**
 * InvoiceTabs renders "Possible Recipes" and "Additional Info" tabs.
 * Requires InvoiceContextProvider for invoice data.
 */
const meta = {
  title: "Invoices/Tabs/InvoiceTabs",
  component: InvoiceTabs,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <InvoiceContextProvider
        invoice={mockInvoice}
        merchant={mockMerchant}>
        <div className='max-w-xl p-4'>
          <Story />
        </div>
      </InvoiceContextProvider>
    ),
  ],
} satisfies Meta<typeof InvoiceTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default tabs with mock invoice data. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
