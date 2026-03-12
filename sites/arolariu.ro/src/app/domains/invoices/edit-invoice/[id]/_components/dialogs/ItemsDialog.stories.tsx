import type {Meta, StoryObj} from "@storybook/react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the ItemsDialog component.
 *
 * @remarks Static preview — component imports `usePaginationWithSearch` from the `@/hooks`
 * barrel which transitively pulls in "use server" actions (fetchInvoice, fetchMerchant, etc.)
 * that cannot be bundled by Storybook's Vite/Rollup. Also depends on `useDialog` context and
 * editable item state. This story renders a faithful HTML replica of the items editing table
 * with sample line items.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ItemsDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-4xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {name: "Whole Milk 1L", qty: 2, unit: "pcs", price: 4.99, total: 9.98},
  {name: "Sourdough Bread", qty: 1, unit: "pcs", price: 6.5, total: 6.5},
  {name: "Free Range Eggs 10pk", qty: 1, unit: "pcs", price: 12.99, total: 12.99},
  {name: "Organic Bananas", qty: 1.2, unit: "kg", price: 3.99, total: 4.79},
  {name: "Cheddar Cheese 200g", qty: 1, unit: "pcs", price: 8.49, total: 8.49},
];

/** Default items editing dialog with sample data. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Edit Invoice Items</h2>
        <p className='mt-1 text-sm text-gray-500'>Add, modify, or remove line items from this invoice.</p>
      </div>

      <div className='p-6'>
        {/* Table */}
        <div className='overflow-x-auto rounded-lg border'>
          <table className='min-w-full divide-y dark:divide-gray-700'>
            <thead>
              <tr className='bg-gray-50 dark:bg-gray-800/50'>
                <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Item</th>
                <th className='px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500'>Qty</th>
                <th className='px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500'>Unit</th>
                <th className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>Price</th>
                <th className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>Total</th>
                <th className='px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y bg-white dark:divide-gray-700 dark:bg-gray-900'>
              {sampleItems.map((item) => (
                <tr
                  key={item.name}
                  className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                  <td className='px-4 py-3 text-sm font-medium'>{item.name}</td>
                  <td className='px-4 py-3 text-center text-sm'>{item.qty}</td>
                  <td className='px-4 py-3 text-center text-sm'>{item.unit}</td>
                  <td className='px-4 py-3 text-right text-sm'>{item.price.toFixed(2)}</td>
                  <td className='px-4 py-3 text-right text-sm font-medium'>{item.total.toFixed(2)}</td>
                  <td className='px-4 py-3 text-center'>
                    <button className='rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800'>
                      <TbTrash className='h-4 w-4 text-red-500' />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className='bg-gray-50 dark:bg-gray-800/50'>
                <td
                  className='px-4 py-2 text-xs text-gray-500'
                  colSpan={2}>
                  5 items found (showing 5)
                </td>
                <td
                  className='px-4 py-2 text-right text-xs text-gray-500'
                  colSpan={2}>
                  Page 1 of 1
                </td>
                <td
                  className='px-4 py-2 text-right'
                  colSpan={2}>
                  <button
                    className='px-2 py-1 text-xs text-gray-400'
                    disabled>
                    Previous
                  </button>
                  <button
                    className='px-2 py-1 text-xs text-gray-400'
                    disabled>
                    Next
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Controls */}
        <div className='mt-4 flex items-center justify-between'>
          <button className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm'>
            <TbPlus className='h-4 w-4' />
            Add Item
          </button>
          <span className='text-xs text-gray-500'>5 items total</span>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbDisc className='h-4 w-4' />
          Save Changes
        </button>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
