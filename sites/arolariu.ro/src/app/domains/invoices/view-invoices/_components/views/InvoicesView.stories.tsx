import type {Meta, StoryObj} from "@storybook/react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyInvoices, WithInvoiceDialogs} from "../../../_storybook";
import RenderInvoicesView from "./InvoicesView";

/**
 * InvoicesView renders a filterable and sortable list of invoices with table/grid toggle.
 * Depends on `useDialog`, Next.js navigation hooks, and `usePaginationWithSearch`.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/InvoicesView",
  component: RenderInvoicesView,
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <div style={{padding: "2rem"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RenderInvoicesView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices view with filter toolbar and table (interactive). */
export const Default: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores();
  },
  args: {
    invoices: storyInvoices,
  },
};

/** Empty state — no invoices available. */
export const EmptyState: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
  },
  args: {
    invoices: [],
  },
};
