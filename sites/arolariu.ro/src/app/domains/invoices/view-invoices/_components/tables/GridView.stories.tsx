import {InvoiceBuilder} from "@/data/mocks";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {GridView} from "./GridView";

/* eslint-disable @typescript-eslint/no-empty-function -- Storybook action stubs */
const noop = () => {};
/* eslint-enable @typescript-eslint/no-empty-function */

const withDialogProvider: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

/**
 * GridView renders invoices as a responsive card grid with images,
 * titles, dates, amounts, and selection checkboxes.
 *
 * Mounted with real `Invoice` fixtures built via `InvoiceBuilder`. Selection
 * state is backed by the real `useInvoicesStore` Zustand store — no mocking.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GridView",
  component: GridView,
  decorators: [withDialogProvider],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    handlePrevPage: noop,
    handleNextPage: noop,
    handlePageSizeChange: noop,
  },
} satisfies Meta<typeof GridView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the grid view with 6 invoice cards. */
export const Default: Story = {
  args: {
    invoices: Array.from({length: 6}, () => new InvoiceBuilder().build()),
  },
};

/** Multiple pages of results — shows pagination controls. */
export const WithPagination: Story = {
  args: {
    invoices: Array.from({length: 9}, () => new InvoiceBuilder().build()),
    currentPage: 2,
    totalPages: 4,
  },
};

/** Empty state — no invoices available. */
export const EmptyState: Story = {
  args: {
    invoices: [],
  },
};
