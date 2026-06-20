import type {Meta, StoryObj} from "@storybook/react";
import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyDeletedInvoice,
  storyEurInvoice,
  storyGbpInvoice,
  storyInvoices,
  storyLongNameInvoice,
  storyManyInvoices,
  storyUsdInvoice,
  WithInvoiceDialogs,
} from "../../../_storybook";
import {GridView} from "./GridView";

/**
 * GridView renders invoices as a responsive card grid with images,
 * titles, dates, amounts, and selection checkboxes.
 */
const meta = {
  title: "arolariu.ro/IMS/Views/GridView",
  component: GridView,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Responsive card grid view for invoices with scan thumbnails, selection checkboxes, dates, amounts, and item counts. Includes pagination controls and page size selector. Uses motion animations for card entrance.",
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
} satisfies Meta<typeof GridView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grid view with 3 invoice cards from story fixtures. */
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
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Grid layout showing 3 invoice cards with scan thumbnails, selection checkboxes, vendor names, dates, amounts, and item counts. Cards use motion animations for entrance. Pagination controls hidden when totalPages is 1.",
      },
    },
  },
};

/** Empty state — no invoices available. */
export const EmptyState: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
  },
  args: {
    invoices: [],
    pageSize: 10,
    currentPage: 1,
    totalPages: 0,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Empty state when no invoices exist or all invoices are filtered out. Displays centered message with icon encouraging user to create their first invoice or adjust filters. Pagination controls are hidden.",
      },
    },
  },
};

/** Single invoice — sparse list edge case. */
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
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with a single invoice card. Tests sparse layout rendering between empty and full states.",
      },
    },
  },
};

/** Two invoices — minimal viable list. */
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
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with two invoice cards. Verifies layout with minimal viable data set.",
      },
    },
  },
};

/** Many invoices (60) — overflow scrolling and performance test. */
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
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Grid with 60 invoices paginated (10 per page, 6 pages total). Tests pagination controls, overflow, and rendering performance with large data sets.",
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
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Grid with an invoice having an extremely long name. Tests text truncation, ellipsis, and tooltip behavior without breaking card layout.",
      },
    },
  },
};

/** Paginated view (page 2 of 3). */
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
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story: "Grid showing page 2 of 6 with both previous and next navigation enabled. Tests mid-pagination state.",
      },
    },
  },
};

/** Large page size (25 items per page). */
export const LargePageSize: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyManyInvoices});
  },
  args: {
    invoices: storyManyInvoices.slice(0, 25),
    pageSize: 25,
    currentPage: 1,
    totalPages: 3,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with 25 items per page. Tests dense layout and page size selector with larger page sizes.",
      },
    },
  },
};

/** Last page (page 6 of 6) — next button disabled. */
export const LastPage: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyManyInvoices});
  },
  args: {
    invoices: storyManyInvoices.slice(50, 60),
    pageSize: 10,
    currentPage: 6,
    totalPages: 6,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
};

/** Multi-currency invoices (EUR, USD, GBP mixed). */
export const MultiCurrency: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [storyEurInvoice, storyUsdInvoice, storyGbpInvoice]});
  },
  args: {
    invoices: [storyEurInvoice, storyUsdInvoice, storyGbpInvoice],
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
};

/** Grid with soft-deleted invoice included. */
export const WithSoftDeleted: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [...storyInvoices, storyDeletedInvoice]});
  },
  args: {
    invoices: [...storyInvoices, storyDeletedInvoice],
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
};

/** Huge data set (120 items) — stress test with large page. */
export const HugeDataset: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const hugeSet = [...storyManyInvoices, ...storyManyInvoices];
    seedInvoiceStoryStores({invoices: hugeSet});
  },
  args: {
    invoices: [...storyManyInvoices, ...storyManyInvoices].slice(0, 50),
    pageSize: 50,
    currentPage: 1,
    totalPages: 3,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
};

/** Page 3 of 6 — mid-range pagination state. */
export const PaginatedPage3: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyManyInvoices});
  },
  args: {
    invoices: storyManyInvoices.slice(20, 30),
    pageSize: 10,
    currentPage: 3,
    totalPages: 6,
    handlePrevPage: () => console.log("Previous page"),
    handleNextPage: () => console.log("Next page"),
    handlePageSizeChange: (size: number) => console.log("Page size:", size),
  },
};
