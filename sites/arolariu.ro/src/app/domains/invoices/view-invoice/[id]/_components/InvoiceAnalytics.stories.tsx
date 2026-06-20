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

/** Invoice with many items (20) — rich analytics data. */
export const ManyItems: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const manyItemsInvoice = {
      ...storyInvoice,
      items: Array.from({length: 20}, (_, i) => ({
        ...storyInvoice.items[0]!,
        name: `Item ${i + 1}`,
        price: 10 + i * 2,
      })),
    };
    return (
      <WithViewInvoiceContext invoice={manyItemsInvoice}>
        <InvoiceAnalytics />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Analytics for an invoice with 20 line items. Tests chart rendering, category distribution, and price breakdown with rich data.",
      },
    },
  },
};

/** Invoice with EUR currency — multi-currency analytics. */
export const EurInvoice: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const eurInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        currency: {code: "EUR", symbol: "€", name: "Euro"},
        totalCostAmount: 125.5,
      },
    };
    return (
      <WithViewInvoiceContext invoice={eurInvoice}>
        <InvoiceAnalytics />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Analytics for an invoice in EUR currency. Tests currency formatting and symbol rendering in charts and summaries.",
      },
    },
  },
};

/** Invoice with USD currency — US dollar analytics. */
export const UsdInvoice: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const usdInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        currency: {code: "USD", symbol: "$", name: "US Dollar"},
        totalCostAmount: 89.99,
      },
    };
    return (
      <WithViewInvoiceContext invoice={usdInvoice}>
        <InvoiceAnalytics />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Analytics for an invoice in USD currency. Tests dollar symbol rendering and US currency formatting.",
      },
    },
  },
};

/** Analytics with many invoices in store (50) — comparison analytics stress test. */
export const WithManyInvoices: Story = {
  decorators: [
    (Story) => {
      const manyInvoices = Array.from({length: 50}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-analytics-many-${i}`,
        name: `Invoice ${i + 1}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          totalCostAmount: 50 + i * 5,
        },
      }));
      seedInvoiceStoryStores({invoices: manyInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <InvoiceAnalytics />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Analytics with 50 invoices in store. Tests comparison tab rendering, trend calculations, and performance with large dataset.",
      },
    },
  },
};

/** Analytics with single item invoice — minimal data. */
export const SingleItemInvoice: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const singleItemInvoice = {
      ...storyInvoice,
      items: [storyInvoice.items[0]!],
    };
    return (
      <WithViewInvoiceContext invoice={singleItemInvoice}>
        <InvoiceAnalytics />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Analytics for an invoice with only one line item. Tests minimal data state and chart rendering with sparse data.",
      },
    },
  },
};
