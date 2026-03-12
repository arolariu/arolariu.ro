import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbFileX, TbPhoto, TbReceipt, TbShoppingCart, TbTrash, TbX} from "react-icons/tb";

/**
 * Static visual preview of the DeleteInvoiceDialog component.
 *
 * @remarks Static preview — component imports "use server" action (deleteInvoice
 * from `@/lib/actions/invoices/deleteInvoice`) that cannot be bundled by Storybook's
 * Vite/Rollup. Also depends on `useDialog` context and Zustand stores. This story
 * renders a faithful HTML replica of the confirmation dialog with impact summary.
 */
const meta = {
  title: "Invoices/Dialogs/DeleteInvoiceDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-lg p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default delete confirmation dialog with invoice summary and impact warning. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400'>
          <TbTrash className='h-5 w-5' />
          Delete Invoice
        </h2>
        <p className='mt-1 text-sm text-gray-500'>This action cannot be undone. The invoice and all associated data will be permanently removed.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Invoice Summary Card */}
        <div className='rounded-lg border bg-gray-50 p-4 dark:bg-gray-800'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30'>
              <TbReceipt className='h-5 w-5 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <p className='font-medium'>Weekly Groceries</p>
              <p className='text-xs text-gray-500'>a1b2c3d4-e5f6-7890-abcd-ef1234567890</p>
              <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>Shopping at Lidl — weekly grocery run</p>
            </div>
          </div>
        </div>

        {/* Deletion Impact Warning */}
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50'>
          <div className='flex items-center gap-2'>
            <TbAlertTriangle className='h-4 w-4 text-red-600' />
            <h4 className='text-sm font-semibold text-red-800 dark:text-red-300'>Deletion Impact</h4>
          </div>
          <p className='mt-1 text-xs text-red-700 dark:text-red-400'>The following data will be permanently deleted:</p>
          <ul className='mt-2 space-y-1'>
            <li className='flex items-center gap-2 text-xs text-red-700 dark:text-red-400'>
              <TbFileX className='h-3.5 w-3.5' />
              Invoice record and all metadata
            </li>
            <li className='flex items-center gap-2 text-xs text-red-700 dark:text-red-400'>
              <TbPhoto className='h-3.5 w-3.5' />3 uploaded scans
            </li>
            <li className='flex items-center gap-2 text-xs text-red-700 dark:text-red-400'>
              <TbShoppingCart className='h-3.5 w-3.5' />
              12 line items
            </li>
            <li className='flex items-center gap-2 text-xs text-red-700 dark:text-red-400'>
              <TbX className='h-3.5 w-3.5' />2 shared access entries revoked
            </li>
          </ul>
        </div>

        <hr className='dark:border-gray-700' />

        {/* Confirmation Input */}
        <div className='space-y-3'>
          <div>
            <label className='text-sm font-medium'>
              Type <span className='font-semibold text-red-600'>Weekly Groceries</span> to confirm
            </label>
            <input
              className='mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
              placeholder='Weekly Groceries'
              readOnly
            />
          </div>
          <div className='flex items-start gap-2 rounded-lg border p-3'>
            <input
              type='checkbox'
              className='mt-0.5 h-4 w-4 rounded border'
              readOnly
            />
            <div>
              <p className='text-sm font-medium leading-none'>I understand this action is irreversible</p>
              <p className='mt-1 text-xs text-gray-500'>All invoice data, scans, and shared access will be permanently deleted.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button
          className='flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm text-white opacity-50'
          disabled>
          <TbTrash className='h-4 w-4' />
          Delete Permanently
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
