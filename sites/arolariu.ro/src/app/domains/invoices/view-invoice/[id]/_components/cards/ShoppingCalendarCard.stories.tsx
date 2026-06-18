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
