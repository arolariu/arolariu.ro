import type {Meta, StoryObj} from "@storybook/react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyInvoices, WithInvoiceDialogs} from "../../../_storybook";
import {GridView} from "./GridView";

/**
 * GridView renders invoices as a responsive card grid with images,
 * titles, dates, amounts, and selection checkboxes.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GridView",
  component: GridView,
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
          "Grid layout showing 3 invoice cards with scan thumbnails, selection checkboxes, vendor names, dates, amounts, and item counts. Includes pagination controls and page size selector at bottom. Cards use motion animations for entrance.",
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
