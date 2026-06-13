import type {Meta, StoryObj} from "@storybook/react";
import {WithInvoiceDialogs} from "../../_storybook";
import InvoicesHeader from "./InvoicesHeader";

/**
 * InvoicesHeader renders the header for the invoices list page with title,
 * description, and action buttons (import, export, print, new invoice).
 * Depends on `useDialog`.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/InvoicesHeader",
  component: InvoicesHeader,
  decorators: [(Story) => <WithInvoiceDialogs><Story /></WithInvoiceDialogs>],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Header for invoices listing page displaying page title, description, and action buttons (Import Scans, Export All, Print All, New Invoice). Uses DialogContext for modal orchestration.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InvoicesHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default invoices header with all action buttons enabled.
 * Dialog buttons dispatch DialogContext state through WithInvoiceDialogs; dialog content is covered by dialog-specific stories.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Interactive header rendering with all action buttons enabled. Import and export actions dispatch dialog state through DialogContext; dialog content is covered by dedicated dialog stories.",
      },
    },
  },
};
