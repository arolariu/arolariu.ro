import {seedInvoiceStoryStores, storyInvoice, storyInvoices, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceAnalytics} from "./InvoiceAnalytics";

/**
 * InvoiceAnalytics renders the tabbed analytics dashboard for a single invoice:
 * a "Current" tab (summary, category spending, price distribution, items
 * breakdown) and — for the invoice owner — a "Compare" tab with cross-invoice
 * trends and merchant breakdowns.
 *
 * @remarks
 * The real component depends on `useInvoiceContext` (focused invoice + merchant),
 * `useInvoicesStore` (all cached invoices for comparison analytics), and
 * `useUserInformation` (which gates the owner-only Compare tab). Stories mount
 * the real component inside `WithViewInvoiceContext` and seed the Zustand stores
 * so the charts and tables compute from real fixture data.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/InvoiceAnalytics",
  component: InvoiceAnalytics,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Tabbed invoice analytics dashboard. Mounts the real component with seeded invoice/merchant stores so summary stats and charts render from fixture data.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InvoiceAnalytics>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics dashboard with summary stats, category spending, price distribution, and items breakdown. */
export const Default: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <InvoiceAnalytics />
    </WithViewInvoiceContext>
  ),
};

/** Invoice with no line items, exercising the analytics empty/zero states. */
export const NoItems: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, items: []}}>
      <InvoiceAnalytics />
    </WithViewInvoiceContext>
  ),
};
