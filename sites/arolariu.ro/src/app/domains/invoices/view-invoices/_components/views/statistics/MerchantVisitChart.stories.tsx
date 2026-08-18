import type {Meta, StoryObj} from "@storybook/react";
import {computeMerchantVisitFrequency} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices} from "./__mocks__/mockInvoices";
import {MerchantVisitChart} from "./MerchantVisitChart";

const meta = {title: "Invoices/Statistics/MerchantVisitChart", component: MerchantVisitChart} satisfies Meta<typeof MerchantVisitChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {args: {data: computeMerchantVisitFrequency(mockInvoices), currency: "RON"}};
export const Empty: Story = {args: {data: computeMerchantVisitFrequency(emptyInvoices), currency: "RON"}};
