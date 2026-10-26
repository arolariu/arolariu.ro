import {InvoiceBuilder} from "@/data/mocks";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import TableViewActions from "./TableViewActions";

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
 * TableViewActions renders a dropdown menu with edit, share, and
 * delete actions for individual invoice rows.
 *
 * Mounted with a real `Invoice` fixture and wrapped in the real
 * `DialogProvider` because the share/delete actions dispatch through
 * `useDialog`.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableViewActions",
  component: TableViewActions,
  decorators: [
    withDialogProvider,
    (Story) => (
      <div style={{display: "flex", minHeight: "200px", alignItems: "flex-start", justifyContent: "center", paddingTop: "2rem"}}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  args: {
    invoice: new InvoiceBuilder().build(),
  },
} satisfies Meta<typeof TableViewActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default collapsed trigger — click to reveal the actions dropdown menu. */
export const Default: Story = {};
