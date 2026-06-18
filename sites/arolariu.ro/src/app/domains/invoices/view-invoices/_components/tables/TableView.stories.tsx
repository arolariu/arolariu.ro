import type {Meta, StoryObj} from "@storybook/react";
import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoices,
  storyLongNameInvoice,
  storyManyInvoices,
  WithInvoiceDialogs,
} from "../../../_storybook";
import {TableView} from "./TableView";

/**
 * TableView renders invoices in a sortable, paginated table with
 * checkboxes, category badges, dates, amounts, and row-level actions.
 */
const meta = {
  title: "arolariu.ro/IMS/Views/TableView",
  component: TableView,
  tags: ["autodocs"],
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

/** Single invoice row — sparse data edge case. */
export const SingleInvoice: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyInvoices.slice(0, 1)});
  },
  args: {
    invoices: storyInvoices.slice(0, 1),
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
        story: "Table with a single invoice row. Tests sparse table rendering between empty and full states.",
      },
    },
  },
};

/** Two invoice rows — minimal viable table. */
export const TwoInvoices: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyInvoices.slice(0, 2)});
  },
  args: {
    invoices: storyInvoices.slice(0, 2),
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
        story: "Table with two invoice rows. Verifies layout with minimal viable data set.",
      },
    },
  },
};

/** Many invoices (60) — paginated overflow test. */
export const ManyInvoices: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyManyInvoices});
  },
  args: {
    invoices: storyManyInvoices.slice(0, 10),
    pageSize: 10,
    currentPage: 1,
    totalPages: 6,
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
          "Table with 60 invoices paginated (10 per page, 6 pages total). Tests pagination controls, overflow, and rendering performance with large data sets.",
      },
    },
  },
};

/** Long invoice name — text truncation test. */
export const LongInvoiceName: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [storyLongNameInvoice]});
  },
  args: {
    invoices: [storyLongNameInvoice],
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
          "Table with an invoice having an extremely long name. Tests text truncation, ellipsis, and tooltip behavior without breaking table cell layout.",
      },
    },
  },
};

/** Sorted by amount ascending. */
export const SortedByAmountAsc: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores();
  },
  args: {
    invoices: storyInvoices,
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    sortBy: "amount",
    sortDirection: "asc",
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
    onSort: (field: "date" | "amount" | "name") => console.log("Sort by:", field),
  },
  parameters: {
    docs: {
      description: {
        story: "Table sorted by amount in ascending order. Tests sort indicator rendering and column header active state.",
      },
    },
  },
};

/** Paginated view (page 2 of 6). */
export const PaginatedPage2: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyManyInvoices});
  },
  args: {
    invoices: storyManyInvoices.slice(10, 20),
    pageSize: 10,
    currentPage: 2,
    totalPages: 6,
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
        story: "Table showing page 2 of 6 with both previous and next navigation enabled. Tests mid-pagination state.",
      },
    },
  },
};

/** Sorted by name descending. */
export const SortedByNameDesc: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores();
  },
  args: {
    invoices: storyInvoices,
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    sortBy: "name",
    sortDirection: "desc",
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
    onSort: (field: "date" | "amount" | "name") => console.log("Sort by:", field),
  },
  parameters: {
    docs: {
      description: {
        story: "Table sorted by name in descending order. Tests alphabetical sort and column header state.",
      },
    },
  },
};
