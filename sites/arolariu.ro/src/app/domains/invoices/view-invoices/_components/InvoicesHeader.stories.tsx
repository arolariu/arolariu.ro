import type {Meta, StoryObj} from "@storybook/react";
import {WithInvoiceDialogs} from "../../_storybook";
import InvoicesHeader from "./InvoicesHeader";

/**
 * InvoicesHeader renders the header for the invoices list page with title,
 * description, and action buttons (import, export, print, new invoice).
 * Depends on `useDialog`.
 */
const meta = {
  title: "Invoices/ViewInvoices/InvoicesHeader",
  component: InvoicesHeader,
  decorators: [(Story) => <WithInvoiceDialogs><Story /></WithInvoiceDialogs>],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof InvoicesHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices header with all action buttons (interactive). */
export const Default: Story = {};
