import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, storyOnlineInvoice, WithInvoiceDialogs} from "../../../_storybook";
import TableViewActions from "./TableViewActions";

/**
 * TableViewActions renders a dropdown menu with edit, share, and
 * delete actions for individual invoice rows. Depends on
 * `useDialog` context and `useTranslations`.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableViewActions",
  component: TableViewActions,
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <div style={{display: "flex", minHeight: "200px", alignItems: "flex-start", justifyContent: "center", paddingTop: "2rem"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TableViewActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoice actions dropdown (interactive). */
export const Default: Story = {
  args: {
    invoice: storyInvoice,
  },
};

/** Online invoice actions dropdown. */
export const OnlineInvoice: Story = {
  args: {
    invoice: storyOnlineInvoice,
  },
};
