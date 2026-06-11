import type {Meta, StoryObj} from "@storybook/react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyInvoices} from "../../../_storybook";
import {TableView} from "./TableView";

/**
 * TableView renders invoices in a sortable, paginated table with
 * checkboxes, category badges, dates, amounts, and row-level actions.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableView",
  component: TableView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Sortable table view for invoices with selection checkboxes, category badges, formatted dates and amounts, and row actions menu. Includes column sorting, pagination controls, and page size selector. Uses tooltips for action buttons.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{padding: "2rem", backgroundColor: "var(--color-background)"}}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TableView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Table view with 3 invoice rows from story fixtures. */
export const WithInvoices: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores();
  },
  args: {
    invoices: storyInvoices,
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    sortBy: "date",
    sortDirection: "desc",
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
    onSort: (field: "date" | "amount" | "name") => console.log("Sort by:", field),
  },
};

/** Empty state — no invoices. */
export const EmptyState: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
  },
  args: {
    invoices: [],
    pageSize: 10,
    currentPage: 1,
    totalPages: 0,
    sortBy: null,
    sortDirection: null,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
    onSort: (field: "date" | "amount" | "name") => console.log("Sort by:", field),
  },
};
