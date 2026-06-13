import type {Meta, StoryObj} from "@storybook/react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyInvoices, WithInvoiceDialogs} from "../../../_storybook";
import RenderInvoicesView from "./InvoicesView";

/**
 * InvoicesView renders a filterable and sortable list of invoices with table/grid toggle.
 * Depends on `useDialog`, Next.js navigation hooks, and `usePaginationWithSearch`.
 */
const meta = {
  title: "arolariu.ro/IMS/Views/InvoicesView",
  component: RenderInvoicesView,
  tags: ["autodocs"],
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
    docs: {
      description: {
        component:
          "Mounts the real invoice list view with the invoice dialog provider, seeded invoice stores, filters, and table/grid switching behavior.",
      },
    },
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
  parameters: {
    docs: {
      description: {
        story: "Interactive invoice list view populated with the deterministic invoice fixtures and seeded invoice store.",
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
  },
  parameters: {
    docs: {
      description: {
        story: "Empty invoice list state with no invoices and a reset store.",
      },
    },
  },
};

/** Sparse list with a single invoice. */
export const FewInvoices: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: storyInvoices.slice(0, 1)});
  },
  args: {
    invoices: storyInvoices.slice(0, 1),
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice list view populated with a single invoice to show the sparse-list layout between the empty and full states.",
      },
    },
  },
};
