import type {Meta, StoryObj} from "@storybook/react";
import {emptyInvoices, mockInvoices} from "./statistics/__mocks__/mockInvoices";
import RenderStatisticsView from "./StatisticsView";

const meta = {
  title: "Invoices/Statistics/StatisticsView",
  component: RenderStatisticsView,
  parameters: {layout: "padded"},
} satisfies Meta<typeof RenderStatisticsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {invoices: mockInvoices}};
export const Empty: Story = {args: {invoices: emptyInvoices}};
