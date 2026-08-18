import type {Meta, StoryObj} from "@storybook/react";
import {computeTopProducts} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices} from "./__mocks__/mockInvoices";
import {TopProductsChart} from "./TopProductsChart";

const meta = {title: "Invoices/Statistics/TopProductsChart", component: TopProductsChart} satisfies Meta<typeof TopProductsChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {args: {data: computeTopProducts(mockInvoices), currency: "RON"}};
export const Empty: Story = {args: {data: computeTopProducts(emptyInvoices), currency: "RON"}};
