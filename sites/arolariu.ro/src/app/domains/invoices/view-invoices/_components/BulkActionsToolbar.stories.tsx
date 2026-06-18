import type {Meta, StoryObj} from "@storybook/react";
import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoice,
  storyManyInvoices,
  storyPublicInvoice,
  WithInvoiceDialogs,
} from "../../_storybook";
import BulkActionsToolbar from "./BulkActionsToolbar";

/**
 * BulkActionsToolbar provides bulk actions for selected invoices.
 *
 * This story mounts the real BulkActionsToolbar component wrapped with
 * WithInvoiceDialogs and seeds the invoice store with selected invoices.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/BulkActionsToolbar",
  component: BulkActionsToolbar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <div style={{minHeight: "400px", position: "relative"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
    ),
  ],
} satisfies Meta<typeof BulkActionsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * With selected invoices — toolbar appears at bottom with bulk actions.
 */
export const WithSelectedInvoices: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({
        selectedInvoices: [storyInvoice, storyPublicInvoice],
      });
      return <Story />;
    },
  ],
};

/**
 * Single invoice selected — minimal selection edge case.
 */
export const SingleSelected: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({
        selectedInvoices: [storyInvoice],
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: "Toolbar with a single invoice selected. Tests singular text rendering and bulk action behavior with minimal selection.",
      },
    },
  },
};

/**
 * Many invoices selected (10) — bulk selection test.
 */
export const ManySelected: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({
        selectedInvoices: storyManyInvoices.slice(0, 10),
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: "Toolbar with 10 invoices selected. Tests count display, plural text, and bulk action performance with larger selections.",
      },
    },
  },
};
