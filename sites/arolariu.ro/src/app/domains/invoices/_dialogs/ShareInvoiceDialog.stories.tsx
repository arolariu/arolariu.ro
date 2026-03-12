import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbGlobe, TbLock} from "react-icons/tb";

/**
 * Static visual preview of the ShareInvoiceDialog component.
 *
 * @remarks Static preview — component imports "use server" action (patchInvoice
 * from `@/lib/actions/invoices/patchInvoice`) that cannot be bundled by Storybook's
 * Vite/Rollup. Also depends on `useDialog` context and clipboard APIs. This story
 * renders a faithful HTML replica of the initial sharing mode selection screen.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default selection mode showing public vs private sharing options. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Share Invoice</h2>
        <p className='mt-1 text-sm text-gray-500'>Choose how to share &ldquo;Weekly Groceries&rdquo;</p>
      </div>

      <div className='space-y-4 p-6'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>Choose how you&apos;d like to share this invoice:</p>

        {/* Options Grid */}
        <div className='grid gap-3'>
          <div className='cursor-pointer rounded-lg border p-4 transition-colors hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'>
            <div className='flex items-start gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30'>
                <TbGlobe className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <h4 className='text-base font-semibold'>Public Sharing</h4>
                <p className='text-sm text-gray-500'>
                  Generate a <strong>shareable link or QR code</strong> accessible by anyone.
                </p>
              </div>
            </div>
          </div>

          <div className='cursor-pointer rounded-lg border p-4 transition-colors hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'>
            <div className='flex items-start gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
                <TbLock className='h-5 w-5 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <h4 className='text-base font-semibold'>Private Sharing</h4>
                <p className='text-sm text-gray-500'>
                  Send an <strong>email invitation</strong> to a specific recipient.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className='mt-4 rounded-lg border bg-gray-50 p-3 dark:bg-gray-800'>
          <div className='flex items-center gap-2'>
            <TbAlertTriangle className='h-4 w-4 text-yellow-600' />
            <h4 className='text-sm font-semibold'>Privacy Notice</h4>
          </div>
          <p className='mt-1 text-xs text-gray-600 dark:text-gray-400'>
            Public links allow anyone with the URL to view this invoice. Private sharing sends a secure invitation via email.
          </p>
        </div>
      </div>
    </div>
  ),
};
