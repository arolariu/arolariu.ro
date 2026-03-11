import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../../messages/en.json";

/**
 * InvoiceDetailsCard displays the full invoice summary: date, category,
 * payment method, total, and a paginated items table. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the invoice details card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceDetailsCard",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-3xl">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full invoice details preview with items table. */
export const Preview: Story = {
  render: () => (
    <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-900">
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Invoice Details</h3>
          <span title="Important">❤️</span>
        </div>
        <p className="text-sm text-gray-500">Kaufland • Weekly grocery shopping</p>
      </div>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="flex items-center gap-1 text-xs text-gray-500">📅 Date (UTC)</p>
            <p className="text-sm">January 15, 2025, 10:30 AM</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <span className="rounded-full border px-2 py-0.5 text-xs">GROCERIES</span>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-gray-500">💳 Payment</p>
            <p className="text-sm">CREDIT CARD</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Amount</p>
            <p className="text-lg font-bold text-green-600">$125.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 className="mb-2 text-sm font-semibold">Items (8)</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="pb-2 text-left">Item</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Unit</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Organic Milk 2L</td>
                <td className="py-2 text-right">2</td>
                <td className="py-2 text-right">pcs</td>
                <td className="py-2 text-right">$3.99</td>
                <td className="py-2 text-right font-medium">$7.98</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Fresh Salmon</td>
                <td className="py-2 text-right">0.5</td>
                <td className="py-2 text-right">kg</td>
                <td className="py-2 text-right">$24.99</td>
                <td className="py-2 text-right font-medium">$12.50</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold dark:bg-gray-800">
                <td
                  className="py-2 pl-2"
                  colSpan={4}>
                  Grand Total
                </td>
                <td className="py-2 pr-2 text-right">$125.50</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  ),
};
