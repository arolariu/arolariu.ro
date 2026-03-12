import type {Meta, StoryObj} from "@storybook/react";
import {TbCopy, TbDownload, TbMail} from "react-icons/tb";

/**
 * Static visual preview of the ShareAnalyticsDialog component.
 *
 * The actual component depends on `useDialog` context with invoice/merchant
 * payload and clipboard APIs, so this story renders a faithful HTML replica
 * of the tabbed sharing dialog with image and email options.
 */
const meta = {
  title: "Invoices/ViewInvoice/Dialogs/ShareAnalyticsDialog",
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

/** Default analytics sharing dialog with image tab active. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Share Analytics</h2>
        <p className='mt-1 text-sm text-gray-500'>Share spending analytics for Lidl</p>
      </div>

      <div className='p-6'>
        {/* Tabs */}
        <div className='rounded-lg border'>
          <div className='grid grid-cols-2 border-b'>
            <button className='border-b-2 border-purple-500 p-2.5 text-sm font-medium'>Image</button>
            <button className='p-2.5 text-sm text-gray-500'>Email</button>
          </div>

          <div className='space-y-4 p-4'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Download or copy the analytics as an image.</p>

            {/* Preview */}
            <div className='overflow-hidden rounded-lg border'>
              <div className='flex aspect-[2/1] items-center justify-center bg-gray-50 dark:bg-gray-800'>
                <p className='text-sm text-gray-400'>Analytics Preview</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='grid grid-cols-2 gap-2'>
              <button className='flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
                <TbDownload className='h-4 w-4' />
                Download
              </button>
              <button className='flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm'>
                <TbCopy className='h-4 w-4' />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Email tab variant. */
export const EmailTab: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Share Analytics</h2>
        <p className='mt-1 text-sm text-gray-500'>Share spending analytics for Lidl</p>
      </div>

      <div className='p-6'>
        <div className='rounded-lg border'>
          <div className='grid grid-cols-2 border-b'>
            <button className='p-2.5 text-sm text-gray-500'>Image</button>
            <button className='border-b-2 border-purple-500 p-2.5 text-sm font-medium'>Email</button>
          </div>

          <div className='space-y-4 p-4'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Send the analytics report via email.</p>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium'>Email Address</label>
              <input
                type='email'
                className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
                placeholder='colleague@company.com'
                readOnly
              />
            </div>
            <button className='flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
              <TbMail className='h-4 w-4' />
              Send Email
            </button>
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
