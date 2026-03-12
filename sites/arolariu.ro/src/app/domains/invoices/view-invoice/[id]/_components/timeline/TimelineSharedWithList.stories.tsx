import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {faker} from "@faker-js/faker";
import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {TimelineSharedWithList} from "./TimelineSharedWithList";

faker.seed(42);

const mockInvoice = generateRandomInvoice();
const mockMerchant = generateRandomMerchant();

/**
 * TimelineSharedWithList displays the list of users the invoice is shared with.
 * Requires InvoiceContextProvider for invoice data, DialogProvider for sharing actions,
 * and `useUserInformation` for ownership checks.
 */
const meta = {
  title: "Invoices/Timeline/TimelineSharedWithList",
  component: TimelineSharedWithList,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <div className='max-w-sm p-4'>
            <Story />
          </div>
        </InvoiceContextProvider>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof TimelineSharedWithList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default shared with list using mock invoice data. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
