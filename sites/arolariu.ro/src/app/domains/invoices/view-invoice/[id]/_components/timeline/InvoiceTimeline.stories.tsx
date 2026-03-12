import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {faker} from "@faker-js/faker";
import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {InvoiceTimeline} from "./InvoiceTimeline";

faker.seed(42);

const mockInvoice = generateRandomInvoice();
const mockMerchant = generateRandomMerchant();

/**
 * InvoiceTimeline renders a timeline of invoice events with tooltips and sharing info.
 * Requires InvoiceContextProvider for invoice data and DialogProvider for sharing actions.
 */
const meta = {
  title: "Invoices/Timeline/InvoiceTimeline",
  component: InvoiceTimeline,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <div className='max-w-md p-4'>
            <Story />
          </div>
        </InvoiceContextProvider>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof InvoiceTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default timeline with mock invoice events. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
