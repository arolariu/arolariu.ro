import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../_contexts/DialogContext";
import InvoicesHeader from "./InvoicesHeader";

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
 * InvoicesHeader renders the header for the invoices list page with title,
 * description, and action buttons (import, export, print, new invoice).
 *
 * Mounted with the real `DialogProvider` context since the component opens
 * the import/export dialogs via `useDialog`. The dialogs themselves are not
 * rendered here — only the header and its trigger buttons.
 */
const meta = {
  title: "Invoices/ViewInvoices/InvoicesHeader",
  component: InvoicesHeader,
  decorators: [withDialogProvider],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof InvoicesHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices header with all action buttons. */
export const Default: Story = {};
