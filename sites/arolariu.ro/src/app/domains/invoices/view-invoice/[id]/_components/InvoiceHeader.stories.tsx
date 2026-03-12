import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceHeader (view) displays the invoice title, importance badge,
 * and action buttons (edit, delete, print). Depends on `useInvoiceContext`,
 * `useUserInformation`, and `useDialog`.
 *
 * This story renders a static preview of the view-invoice header layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceHeader",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Owner view — edit and delete buttons visible. */
export const OwnerView: Story = {
  render: () => (
    <div className='flex flex-col gap-3 border-b bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900'>
      <div>
        <div className='flex items-center gap-2'>
          <h1 className='text-3xl font-bold tracking-tight'>Weekly Grocery Shopping</h1>
          <span title='Important invoice'>❤️</span>
        </div>
        <p className='text-sm text-gray-500 dark:text-gray-400'>ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890</p>
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className='rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700'>
          ✏️ Edit
        </button>
        <button
          type='button'
          className='rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700'>
          🗑 Delete
        </button>
        <button
          type='button'
          className='rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          🖨 Print
        </button>
      </div>
    </div>
  ),
};

/** Guest view — only print button visible. */
export const GuestView: Story = {
  render: () => (
    <div className='flex flex-col gap-3 border-b bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Shared Invoice</h1>
        <p className='text-sm text-gray-500 dark:text-gray-400'>ID: xyz-shared-invoice-id</p>
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className='rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          🖨 Print
        </button>
      </div>
    </div>
  ),
};
