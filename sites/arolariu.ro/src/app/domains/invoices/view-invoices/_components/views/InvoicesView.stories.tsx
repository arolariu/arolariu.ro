import type {Meta, StoryObj} from "@storybook/react";
import {TbCards, TbCategory, TbClock, TbFilter, TbSearch, TbTable} from "react-icons/tb";

/**
 * Static visual preview of the InvoicesView component.
 *
 * @remarks Static preview — component imports `usePaginationWithSearch` from the `@/hooks`
 * barrel which transitively pulls in "use server" actions (fetchInvoice, fetchMerchant, etc.)
 * that cannot be bundled by Storybook's Vite/Rollup. This story renders a faithful HTML
 * replica of the toolbar and placeholder content area.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/InvoicesView",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className='p-6'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices view with search toolbar and table placeholder. */
export const Default: Story = {
  render: () => (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='space-y-3'>
        <div className='relative'>
          <TbSearch className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
          <input
            type='text'
            placeholder='Search invoices...'
            className='w-full rounded-md border bg-transparent py-2 pl-9 pr-3 text-sm outline-none'
            readOnly
          />
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm'>
            <TbCategory className='h-4 w-4 text-gray-500' />
            <span>Category</span>
          </div>
          <div className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm'>
            <TbClock className='h-4 w-4 text-gray-500' />
            <span>Time of Day</span>
          </div>
          <button className='rounded-md border px-2 py-1.5'>
            <TbFilter className='h-4 w-4 text-gray-500' />
          </button>
          <div className='ml-auto flex'>
            <button className='rounded-l-md bg-gray-900 px-2 py-1.5 text-white dark:bg-gray-100 dark:text-gray-900'>
              <TbTable className='h-4 w-4' />
            </button>
            <button className='rounded-r-md border px-2 py-1.5'>
              <TbCards className='h-4 w-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div className='rounded-md border'>
        <div className='grid grid-cols-5 border-b bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-500 dark:bg-gray-800'>
          <span>Merchant</span>
          <span>Date</span>
          <span>Category</span>
          <span>Total</span>
          <span>Status</span>
        </div>
        {[
          {merchant: "Lidl", date: "Jan 15", category: "Groceries", total: "$45.80", status: "Analyzed"},
          {merchant: "Amazon", date: "Jan 12", category: "Electronics", total: "$129.99", status: "Pending"},
          {merchant: "Starbucks", date: "Jan 10", category: "Dining", total: "$8.50", status: "Analyzed"},
        ].map((row) => (
          <div
            key={row.merchant}
            className='grid grid-cols-5 border-b px-4 py-3 text-sm last:border-b-0'>
            <span className='font-medium'>{row.merchant}</span>
            <span className='text-gray-500'>{row.date}</span>
            <span>{row.category}</span>
            <span>{row.total}</span>
            <span className={row.status === "Analyzed" ? "text-green-600" : "text-yellow-600"}>{row.status}</span>
          </div>
        ))}
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

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  ...Default,
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
