import type {Meta, StoryObj} from "@storybook/react";
import {computeMerchantTrends} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices} from "./__mocks__/mockInvoices";
import {MerchantTrendsChart} from "./MerchantTrendsChart";

const meta = {title: "Invoices/Statistics/MerchantTrendsChart", component: MerchantTrendsChart} satisfies Meta<typeof MerchantTrendsChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {args: {data: computeMerchantTrends(mockInvoices, 5), currency: "RON"}};
export const Empty: Story = {args: {data: computeMerchantTrends(emptyInvoices, 5), currency: "RON"}};
