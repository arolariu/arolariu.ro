import {
  storyDeletedInvoice,
  storyEurInvoice,
  storyGbpInvoice,
  storyHugeInvoice,
  storyInvoices,
  storyLongNameInvoice,
  storyManyInvoices,
  storyUsdInvoice,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import RenderGenerativeView from "./GenerativeView";

/**
 * GenerativeView renders the AI invoice-analysis chat surface. It takes an
 * `invoices` prop and holds local chat state. Mounts the real component.
 */
const meta = {
  title: "arolariu.ro/IMS/Views/GenerativeView",
  component: RenderGenerativeView,
  parameters: {layout: "fullscreen"},
  args: {invoices: storyInvoices},
} satisfies Meta<typeof RenderGenerativeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default chat view with a few invoices in scope. */
export const Default: Story = {};

/** No invoices in scope. */
export const Empty: Story = {args: {invoices: []}};

/** Large invoice set in scope. */
export const ManyInvoices: Story = {args: {invoices: storyManyInvoices}};

/** Single invoice in scope — minimal data. */
export const SingleInvoice: Story = {
  args: {invoices: storyInvoices.slice(0, 1)},
  parameters: {
    docs: {
      description: {
        story: "Chat view with a single invoice in scope. Tests AI chat interface with minimal data context.",
      },
    },
  },
};

/** Huge invoice (120 items) in scope — large item list context. */
export const HugeInvoice: Story = {
  args: {invoices: [storyHugeInvoice]},
  parameters: {
    docs: {
      description: {
        story:
          "Chat view with a huge invoice (120 line items) in scope. Tests AI chat interface handling large invoice metadata and item lists.",
      },
    },
  },
};

/** Two invoices in scope. */
export const TwoInvoices: Story = {
  args: {invoices: storyInvoices.slice(0, 2)},
};

/** Multi-currency invoices (EUR, USD, GBP) in scope. */
export const MultiCurrency: Story = {
  args: {invoices: [storyEurInvoice, storyUsdInvoice, storyGbpInvoice]},
};

/** Long invoice name in scope. */
export const LongInvoiceName: Story = {
  args: {invoices: [storyLongNameInvoice]},
};

/** With soft-deleted invoice in scope. */
export const WithSoftDeleted: Story = {
  args: {invoices: [...storyInvoices, storyDeletedInvoice]},
};

/** Five invoices in scope. */
export const FiveInvoices: Story = {
  args: {invoices: storyInvoices.slice(0, 5)},
};
