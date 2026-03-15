import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowsUpDown, TbCalendar, TbDownload, TbSearch} from "react-icons/tb";

/**
 * Static visual preview of the MerchantReceiptsDialog component.
 *
 * @remarks Static preview — component imports `usePaginationWithSearch` from the `@/hooks`
 * barrel which transitively pulls in "use server" actions (fetchInvoice, fetchMerchant, etc.)
 * that cannot be bundled by Storybook's Vite/Rollup. Also depends on `useDialog` context and
 * API data fetching. This story renders a faithful HTML replica of the receipts table with
 * filtering controls.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantReceiptsDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleReceipts = [
  {name: "Weekly Groceries", date: "Dec 15, 2024", items: 12, id: "1"},
  {name: "Holiday Shopping", date: "Dec 22, 2024", items: 8, id: "2"},
  {name: "Pantry Restock", date: "Jan 3, 2025", items: 15, id: "3"},
];

/** Default receipts dialog with sample merchant receipts. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Receipts from Lidl</h2>
        <p className='mt-1 text-sm text-gray-500'>View all receipts associated with this merchant.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Filter Row */}
        <div className='flex flex-col gap-3 sm:flex-row'>
          <div className='relative flex-1'>
            <TbSearch className='absolute top-2.5 left-2.5 h-4 w-4 text-gray-400' />
            <input
              className='w-full rounded-md border bg-transparent py-2 pr-3 pl-8 text-sm outline-none'
              placeholder='Search receipts...'
              readOnly
            />
          </div>
          <div className='flex gap-2'>
            <button className='flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm'>
              <TbCalendar className='h-4 w-4' />
              All Time
            </button>
            <button className='flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm'>
              <TbArrowsUpDown className='h-4 w-4' />
              Newest
            </button>
          </div>
        </div>

        {/* Table */}
        <div className='overflow-x-auto rounded-lg border'>
          <table className='min-w-full divide-y dark:divide-gray-700'>
            <thead>
              <tr className='bg-gray-50 dark:bg-gray-800/50'>
                <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>Receipt</th>
                <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>Date</th>
                <th className='px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase'>Items</th>
                <th className='px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y bg-white dark:divide-gray-700 dark:bg-gray-900'>
              {sampleReceipts.map((receipt) => (
                <tr
                  key={receipt.id}
                  className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                  <td className='px-4 py-3 text-sm font-medium'>{receipt.name}</td>
                  <td className='px-4 py-3 text-sm'>{receipt.date}</td>
                  <td className='px-4 py-3 text-right text-sm'>{receipt.items}</td>
                  <td className='px-4 py-3 text-right'>
                    <button className='flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
                      <TbDownload className='h-4 w-4' />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className='bg-gray-50 dark:bg-gray-800/50'>
                <td
                  className='px-4 py-2 text-xs text-gray-500'
                  colSpan={4}>
                  3 receipts found (showing 3) — Page 1 of 1
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  ),
};
