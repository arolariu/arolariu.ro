import {InvoiceBuilder} from "@/data/mocks";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {TableView} from "./TableView";

/* eslint-disable @typescript-eslint/no-empty-function -- Storybook action stubs */
const noop = () => {};
/* eslint-enable @typescript-eslint/no-empty-function */

/**
 * Wraps the story in the real invoice `DialogProvider` context.
 *
 * @remarks
 * Defined locally (rather than importing `.storybook/providers.tsx`) because
 * Rolldown's dependency graph resolves the same `.storybook/providers` module
 * from many different relative depths across the story suite, which has been
 * observed to intermittently break unrelated stories during production
 * builds. Importing the production `DialogProvider` context directly avoids
 * that instability while still exercising the real context implementation.
 */
const withDialogProvider: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

/**
 * TableView renders invoices in a sortable, paginated table with
 * checkboxes, category badges, dates, amounts, and row-level actions.
 *
 * Mounted with real `Invoice` fixtures built via `InvoiceBuilder`. Wrapped in
 * the real `DialogProvider` because the row actions menu (`TableViewActions`)
 * opens the shared invoice delete/share dialogs via `useDialog`.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableView",
  component: TableView,
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
    sortBy: null,
    sortDirection: null,
    onSort: noop,
  },
} satisfies Meta<typeof TableView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the table view with 8 invoice rows. */
export const Default: Story = {
  args: {
    invoices: Array.from({length: 8}, () => new InvoiceBuilder().build()),
  },
};

/** Sorted by transaction date, descending. */
export const SortedByDate: Story = {
  args: {
    invoices: Array.from({length: 8}, () => new InvoiceBuilder().build()),
    sortBy: "date",
    sortDirection: "desc",
  },
};

/** Multiple pages of results — shows pagination footer. */
export const WithPagination: Story = {
  args: {
    invoices: Array.from({length: 10}, () => new InvoiceBuilder().build()),
    currentPage: 2,
    totalPages: 5,
  },
};

/** Empty state — no invoices. */
export const EmptyState: Story = {
  args: {
    invoices: [],
  },
};
