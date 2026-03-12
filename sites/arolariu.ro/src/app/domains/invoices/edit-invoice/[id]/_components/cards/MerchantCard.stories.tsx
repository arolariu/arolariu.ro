import type {Meta, StoryObj} from "@storybook/react";

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * Because it depends on `useDialog`, this story renders a static preview.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/MerchantCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the merchant card. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>Merchant Info</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>🛒</div>
          <div>
            <p className='font-medium'>Kaufland</p>
            <p className='text-sm text-gray-500 dark:text-gray-400'>123 Main Street, Bucharest</p>
          </div>
        </div>
        <div className='space-y-2'>
          <button
            type='button'
            className='flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'>
            <span>View Merchant Details</span>
            <span>→</span>
          </button>
          <button
            type='button'
            className='flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'>
            <span>🛍 View All Receipts</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  ),
};
