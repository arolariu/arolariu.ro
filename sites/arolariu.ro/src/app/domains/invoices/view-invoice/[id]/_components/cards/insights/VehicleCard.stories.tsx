import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../../.storybook/providers";
import {VehicleCard} from "./VehicleCard";

/**
 * VehicleCard displays vehicle/fuel-related insights including fuel details,
 * monthly spending charts, cost per km, maintenance reminders, and cheapest
 * nearby station tips. Reads the invoice via `useInvoiceContext`, so every
 * story mounts the real component inside the real `InvoiceContextProvider`
 * re-exported from `.storybook/providers`.
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
  title: "Invoices/ViewInvoice/Insights/VehicleCard",
  component: VehicleCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof VehicleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default fuel purchase insights. */
export const Default: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPaymentAmount(301.5).withPaymentCurrency("RON").build())],
};

/** Small fill-up — fewer estimated liters. */
export const SmallFillUp: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPaymentAmount(80).withPaymentCurrency("RON").build())],
};
