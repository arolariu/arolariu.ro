import {
  invoicePresets,
  storyEmptyInvoice,
  storyEurInvoice,
  storyGbpInvoice,
  storyInvoice,
  storyLargeTotalInvoice,
  storyUsdInvoice,
  storyZeroTotalInvoice,
  withEntityPreset,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {VehicleCard} from "./VehicleCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

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
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Vehicle insights for a standard fuel receipt. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a high-cost fill-up. */
export const HighFuelSpend: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 320.75},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a low-cost partial fill-up. */
export const LowFuelSpend: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 25.5},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for an empty receipt (no items). */
export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyEmptyInvoice}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a premium fuel fill-up (diesel/premium). */
export const PremiumFuel: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 180.0},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a zero-cost receipt (fuel voucher, refund). */
export const ZeroCost: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyZeroTotalInvoice}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a EUR-denominated fuel receipt. */
export const EuroFuel: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyEurInvoice,
        paymentInformation: {...storyEurInvoice.paymentInformation, totalCostAmount: 95.5},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a USD-denominated fuel receipt. */
export const UsdFuel: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyUsdInvoice,
        paymentInformation: {...storyUsdInvoice.paymentInformation, totalCostAmount: 110.25},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for a GBP-denominated fuel receipt. */
export const GbpFuel: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyGbpInvoice,
        paymentInformation: {...storyGbpInvoice.paymentInformation, totalCostAmount: 87.0},
      }}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};

/** Vehicle insights for an extremely expensive fleet fuel order. */
export const HugeTotal: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLargeTotalInvoice}>
      <VehicleCard />
    </WithViewInvoiceContext>
  ),
};
