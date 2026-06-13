import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import {VehicleCard} from "./VehicleCard";

/**
 * VehicleCard shows fuel/vehicle spending insights with a spend trend chart.
 * Reads the active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/VehicleCard",
  component: VehicleCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof VehicleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Vehicle insights for a standard fuel receipt. */
export const Default: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a high-cost fill-up. */
export const HighFuelSpend: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyInvoice,
        paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 320.75},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};
