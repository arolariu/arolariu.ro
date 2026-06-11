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
 * Default invoices header with all action buttons fully interactive.
 * Buttons trigger respective dialogs via WithInvoiceDialogs decorator.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Interactive header rendering with all action buttons enabled. Import Scans opens file picker, Export All triggers download dialog, Print All opens browser print, New Invoice navigates to creation flow.",
      },
    },
  },
};
