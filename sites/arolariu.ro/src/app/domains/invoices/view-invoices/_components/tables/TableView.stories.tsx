import type {Meta, StoryObj} from "@storybook/react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyInvoices, WithInvoiceDialogs} from "../../../_storybook";
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
      <WithInvoiceDialogs>
        <div style={{padding: "2rem", backgroundColor: "var(--color-background)"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
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
  parameters: {
    docs: {
      description: {
        story:
          "Table showing 3 invoice rows with selection checkboxes, vendor names, category badges, formatted dates, amounts, and row action menus. Column headers display sort indicators based on current sortBy and sortDirection. Default sort: date descending.",
      },
    },
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
  parameters: {
    docs: {
      description: {
        story:
          "Empty state when no invoices exist or all invoices are filtered out. Displays centered message with icon encouraging user to create or adjust filters. Component returns EmptyState directly without rendering table structure; pagination controls hidden.",
      },
    },
  },
};
