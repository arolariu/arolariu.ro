import {InvoiceBuilder} from "@/data/mocks";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import RenderInvoicesView from "./InvoicesView";

const withDialogProvider: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

/**
 * RenderInvoicesView renders the filterable, sortable, paginated invoices
 * list with a table/grid view toggle.
 *
 * @remarks
 * Mounted with real `Invoice` fixtures. Filter state is managed via URL
 * search params through `useInvoiceFilters`, which is backed by
 * `next/navigation` — natively supported by the `@storybook/nextjs-vite`
 * framework (see `.storybook/main.ts` `experimentalRSC`/Next.js app-router
 * compatibility), so no additional mocking is required.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/InvoicesView",
  component: RenderInvoicesView,
  decorators: [withDialogProvider],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RenderInvoicesView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices view with search toolbar and table content. */
export const Default: Story = {
  args: {
    invoices: Array.from({length: 12}, () => new InvoiceBuilder().build()),
  },
};

/** Empty state — no invoices available. */
export const Empty: Story = {
  args: {
    invoices: [],
  },
};
