import {
  WithViewInvoiceContext,
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoice,
  storyInvoices,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {ShoppingCalendarCard} from "./ShoppingCalendarCard";

/**
 * ShoppingCalendarCard shows a calendar heat map of spending by day with
 * month statistics and shopping pattern insights.
 *
 * @remarks
 * The real component depends on `useInvoiceContext` (for the focused invoice)
 * and `useInvoicesStore` (for the cached invoices that build the heat map).
 * Stories mount the real component inside `WithViewInvoiceContext` and seed the
 * Zustand store so the calendar renders real spending intensity.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/ShoppingCalendar",
  component: ShoppingCalendarCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Calendar heat map of spending by day, with month totals and shopping-pattern insights derived from the cached invoices in the Zustand store.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ShoppingCalendarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view seeded with all story invoices, so the calendar heat map shows
 * spending across several days of the focused invoice's month.
 */
export const Default: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ShoppingCalendarCard />
    </WithViewInvoiceContext>
  ),
};

/**
 * The store holds only the focused invoice, so the heat map highlights a single
 * shopping day and the tooltip notes it is based on the current invoice only.
 */
export const CurrentInvoiceOnly: Story = {
  decorators: [
    (Story) => {
      seedInvoiceStoryStores({invoices: [storyInvoice]});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ShoppingCalendarCard />
    </WithViewInvoiceContext>
  ),
};

/**
 * The store is empty (hydrated but with no invoices); the component falls back
 * to computing patterns from just the focused invoice.
 */
export const EmptyStore: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ShoppingCalendarCard />
    </WithViewInvoiceContext>
  ),
};

/** Many invoices spread across the month — active heat map. */
export const DenseCalendar: Story = {
  decorators: [
    (Story) => {
      const denseInvoices = Array.from({length: 25}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-dense-${i}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 2, (i % 28) + 1),
          totalCostAmount: Number((20 + i * 5 + Math.random() * 30).toFixed(2)),
        },
      }));
      seedInvoiceStoryStores({invoices: denseInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ShoppingCalendarCard />
    </WithViewInvoiceContext>
  ),
};

/** First invoice of the month — sparse calendar. */
export const FirstInvoice: Story = {
  decorators: [
    (Story) => {
      const firstInvoice = {
        ...storyInvoice,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 2, 1),
        },
      };
      seedInvoiceStoryStores({invoices: [firstInvoice]});
      return <Story />;
    },
  ],
  render: () => {
    const firstInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(2024, 2, 1),
      },
    };
    return (
      <WithViewInvoiceContext invoice={firstInvoice}>
        <ShoppingCalendarCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Last day of month — edge-case calendar rendering. */
export const LastDayOfMonth: Story = {
  decorators: [
    (Story) => {
      const lastDayInvoice = {
        ...storyInvoice,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 2, 31),
        },
      };
      seedInvoiceStoryStores({invoices: [lastDayInvoice]});
      return <Story />;
    },
  ],
  render: () => {
    const lastDayInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(2024, 2, 31),
      },
    };
    return (
      <WithViewInvoiceContext invoice={lastDayInvoice}>
        <ShoppingCalendarCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Invoice on the last day of the month (March 31) to test month-end edge cases."}},
  },
};

/** Mid-month cluster — several invoices in one week. */
export const MidMonthCluster: Story = {
  decorators: [
    (Story) => {
      const clusterInvoices = Array.from({length: 7}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-cluster-${i}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 2, 15 + i),
          totalCostAmount: Number((30 + i * 10).toFixed(2)),
        },
      }));
      seedInvoiceStoryStores({invoices: clusterInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ShoppingCalendarCard />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {description: {story: "Seven consecutive days with invoices (mid-month cluster) to show concentrated spending."}},
  },
};

/** February — 28-day month. */
export const FebruaryMonth: Story = {
  decorators: [
    (Story) => {
      const febInvoices = Array.from({length: 5}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-feb-${i}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 1, i * 5 + 3),
          totalCostAmount: Number((40 + i * 15).toFixed(2)),
        },
      }));
      seedInvoiceStoryStores({invoices: febInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const febInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(2024, 1, 15),
      },
    };
    return (
      <WithViewInvoiceContext invoice={febInvoice}>
        <ShoppingCalendarCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Calendar for February (28 days in 2024 leap year) to test month length handling."}},
  },
};

/** December — year-end month. */
export const DecemberMonth: Story = {
  decorators: [
    (Story) => {
      const decInvoices = Array.from({length: 8}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-dec-${i}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 11, i * 3 + 2),
          totalCostAmount: Number((60 + i * 20).toFixed(2)),
        },
      }));
      seedInvoiceStoryStores({invoices: decInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const decInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(2024, 11, 20),
      },
    };
    return (
      <WithViewInvoiceContext invoice={decInvoice}>
        <ShoppingCalendarCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Calendar for December to test year-end month display."}},
  },
};

/** Same day multiple invoices. */
export const SameDayMultiple: Story = {
  decorators: [
    (Story) => {
      const sameDayInvoices = Array.from({length: 4}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-same-${i}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 2, 15, 10 + i, 0, 0),
          totalCostAmount: Number((25 + i * 10).toFixed(2)),
        },
      }));
      seedInvoiceStoryStores({invoices: sameDayInvoices});
      return <Story />;
    },
  ],
  render: () => {
    const sameDayInvoice = {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(2024, 2, 15, 12, 0, 0),
      },
    };
    return (
      <WithViewInvoiceContext invoice={sameDayInvoice}>
        <ShoppingCalendarCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Four invoices on the same day to test same-day aggregation and heat intensity."}},
  },
};
