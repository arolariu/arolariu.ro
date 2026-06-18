import {storyInvoices, storyManyInvoices} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import RenderGenerativeView from "./GenerativeView";

/**
 * GenerativeView renders the AI invoice-analysis chat surface. It takes an
 * `invoices` prop and holds local chat state. Mounts the real component.
 */
const meta = {
  title: "arolariu.ro/IMS/Views/GenerativeView",
  component: RenderGenerativeView,
  parameters: {layout: "fullscreen"},
  args: {invoices: storyInvoices},
} satisfies Meta<typeof RenderGenerativeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default chat view with a few invoices in scope. */
export const Default: Story = {};

/** No invoices in scope. */
export const Empty: Story = {args: {invoices: []}};

/** Large invoice set in scope. */
export const ManyInvoices: Story = {args: {invoices: storyManyInvoices}};
