import type {Meta, StoryObj} from "@storybook/react";
import {computeProductClassificationSpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {ProductClassificationChart} from "./ProductClassificationChart";

const meta = {
  title: "Invoices/Statistics/ProductClassificationChart",
  component: ProductClassificationChart,
  parameters: {layout: "padded"},
} satisfies Meta<typeof ProductClassificationChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {data: computeProductClassificationSpending(mockInvoices), currency: "RON"}};
export const Empty: Story = {args: {data: computeProductClassificationSpending(emptyInvoices), currency: "RON"}};
export const SingleInvoice: Story = {args: {data: computeProductClassificationSpending(singleInvoice), currency: "RON"}};
