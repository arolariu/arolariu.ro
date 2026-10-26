import {InvoiceBuilder} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import RenderGenerativeView from "./GenerativeView";

/**
 * RenderGenerativeView renders the AI chat analyst experience for invoices,
 * including the chat/settings tabs and the welcome message.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GenerativeView",
  component: RenderGenerativeView,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RenderGenerativeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default generative view with chat tab and welcome message. */
export const Default: Story = {
  args: {
    invoices: Array.from({length: 5}, () => new InvoiceBuilder().build()),
  },
};

/** No invoices available yet. */
export const Empty: Story = {
  args: {
    invoices: [],
  },
};
