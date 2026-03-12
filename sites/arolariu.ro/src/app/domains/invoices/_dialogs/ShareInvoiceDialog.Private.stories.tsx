import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowLeft, TbLock, TbMail} from "react-icons/tb";

/**
 * Static visual preview of the ShareInvoiceDialog Private mode component.
 *
 * The actual component depends on parent dialog state and email submission
 * handlers, so this story renders a faithful HTML replica of the private
 * sharing form with email input.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialogPrivate",
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

/** Default private sharing form with email input. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Share Invoice</h2>
        <p className='mt-1 text-sm text-gray-500'>Send a private invitation for &ldquo;Weekly Groceries&rdquo;</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Back button */}
        <button className='-ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'>
          <TbArrowLeft className='h-4 w-4' />
          Back to options
        </button>

        {/* Private sharing alert */}
        <div className='rounded-lg border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/30'>
          <div className='flex items-center gap-2'>
            <TbLock className='h-4 w-4 text-green-600 dark:text-green-400' />
            <h4 className='text-sm font-semibold text-green-800 dark:text-green-300'>Private & Secure</h4>
          </div>
          <p className='mt-1 text-xs text-green-700 dark:text-green-400'>
            Only the recipient will be able to view this invoice. The link expires after 30 days.
          </p>
        </div>

        {/* Email form */}
        <form className='space-y-3'>
          <div className='space-y-1.5'>
            <label className='text-sm font-medium'>Recipient Email</label>
            <input
              type='email'
              className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
              placeholder='colleague@company.com'
              readOnly
            />
            <p className='text-xs text-gray-500'>An invitation email will be sent to this address.</p>
          </div>
          <button
            className='flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white opacity-50 dark:bg-gray-100 dark:text-gray-900'
            disabled>
            <TbMail className='h-4 w-4' />
            Send Invitation
          </button>
        </form>
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
