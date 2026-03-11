import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../../messages/en.json";

/**
 * ItemsTable renders a paginated table of invoice line items with editing
 * capabilities. Depends on `useDialog` for the edit dialog.
 *
 * This story renders a static preview of the items table layout.
 */
const meta = {
  title: "Invoices/EditInvoice/ItemsTable",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-2xl">
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

/** Preview of items table with sample products. */
export const WithItems: Story = {
  render: () => (
    <div className="rounded-lg border bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Items (5)</h3>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600">
          ✏️ Edit Items
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-gray-500">
            <th className="px-4 py-2 text-left">Item</th>
            <th className="px-4 py-2 text-right">Qty</th>
            <th className="px-4 py-2 text-right">Unit Price</th>
            <th className="px-4 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="px-4 py-2">Organic Milk 2L</td>
            <td className="px-4 py-2 text-right">2 pcs</td>
            <td className="px-4 py-2 text-right">$3.99</td>
            <td className="px-4 py-2 text-right font-medium">$7.98</td>
          </tr>
          <tr className="border-b">
            <td className="px-4 py-2">Sourdough Bread</td>
            <td className="px-4 py-2 text-right">1 pcs</td>
            <td className="px-4 py-2 text-right">$5.50</td>
            <td className="px-4 py-2 text-right font-medium">$5.50</td>
          </tr>
          <tr className="border-b">
            <td className="px-4 py-2">Fresh Chicken Breast</td>
            <td className="px-4 py-2 text-right">0.8 kg</td>
            <td className="px-4 py-2 text-right">$8.99</td>
            <td className="px-4 py-2 text-right font-medium">$7.19</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold dark:bg-gray-800">
            <td
              className="px-4 py-2"
              colSpan={3}>
              Grand Total
            </td>
            <td className="px-4 py-2 text-right">$20.67</td>
          </tr>
        </tfoot>
      </table>
      <div className="flex items-center justify-between border-t p-4 text-sm text-gray-500">
        <span>Page 1 of 2</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="rounded-md border px-3 py-1 text-sm opacity-50 dark:border-gray-600">
            ← Previous
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm dark:border-gray-600">
            Next →
          </button>
        </div>
      </div>
    </div>
  ),
};

/** Empty items table. */
export const Empty: Story = {
  render: () => (
    <div className="rounded-lg border bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Items (0)</h3>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm dark:border-gray-600">
          ✏️ Edit Items
        </button>
      </div>
      <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No items found on this invoice.</div>
    </div>
  ),
};
