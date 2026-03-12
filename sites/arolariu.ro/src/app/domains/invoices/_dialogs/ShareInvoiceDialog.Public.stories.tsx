import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbArrowLeft, TbCopy, TbQrcode} from "react-icons/tb";

/**
 * Static visual preview of the ShareInvoiceDialog Public mode component.
 *
 * The actual component depends on parent dialog state, clipboard APIs, and
 * QR code rendering, so this story renders a faithful HTML replica of the
 * public sharing view with link and QR code tabs.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialogPublic",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-md p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default public sharing view with link and QR code tabs. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Share Invoice</h2>
        <p className='mt-1 text-sm text-gray-500'>Share &ldquo;Weekly Groceries&rdquo; publicly</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Back button */}
        <button className='-ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'>
          <TbArrowLeft className='h-4 w-4' />
          Back to options
        </button>

        {/* Warning alert */}
        <div className='rounded-lg border border-orange-500/50 bg-orange-50 p-3 dark:bg-orange-950/30'>
          <div className='flex items-center gap-2'>
            <TbAlertTriangle className='h-4 w-4 text-orange-600 dark:text-orange-400' />
            <h4 className='text-sm font-semibold text-orange-800 dark:text-orange-300'>Public Access Warning</h4>
          </div>
          <p className='mt-1 text-xs text-orange-700 dark:text-orange-400'>
            Making this invoice public means <strong>anyone with the link</strong> can view it.
          </p>
        </div>

        {/* Tabs */}
        <div className='rounded-lg border'>
          <div className='grid grid-cols-2 border-b'>
            <button className='flex items-center justify-center gap-1.5 border-b-2 border-purple-500 p-2.5 text-sm font-medium'>
              <TbCopy className='h-4 w-4' />
              Direct Link
            </button>
            <button className='flex items-center justify-center gap-1.5 p-2.5 text-sm text-gray-500'>
              <TbQrcode className='h-4 w-4' />
              QR Code
            </button>
          </div>

          <div className='p-4'>
            {/* Link tab content */}
            <div className='flex gap-2'>
              <input
                className='flex-1 rounded-md border bg-gray-50 px-3 py-2 font-mono text-xs dark:bg-gray-800'
                value='https://arolariu.ro/domains/invoices/view-invoice/a1b2c3d4'
                readOnly
              />
              <button className='rounded-md border p-2'>
                <TbCopy className='h-4 w-4' />
              </button>
            </div>
            <p className='mt-2 text-xs text-gray-500'>Anyone with this link can view the invoice.</p>
          </div>
        </div>
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
