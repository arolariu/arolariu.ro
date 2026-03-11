import type {Meta, StoryObj} from "@storybook/react";

/**
 * SharingCard displays invoice sharing status and provides controls for
 * managing shared access. Depends on `useDialog`, `useUserInformation`,
 * and `patchInvoice` server action.
 *
 * This story renders a static preview of the sharing card layout.
 */
const meta = {
  title: "Invoices/EditInvoice/SharingCard",
  decorators: [
    (Story) => (
      <div className='max-w-md'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Private invoice — no shared users. */
export const PrivateInvoice: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>Sharing &amp; Access</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700'>👤</div>
          <div>
            <p className='text-sm font-medium'>Owner</p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>john.doe</p>
          </div>
          <button
            type='button'
            className='ml-auto rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'>
            🔒 Manage Sharing
          </button>
        </div>
        <hr />
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Shared With</h4>
          <p className='text-sm text-gray-500 dark:text-gray-400'>This invoice is private and not shared with anyone.</p>
        </div>
      </div>
      <div className='border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'>
          🔗 Share Invoice →
        </button>
      </div>
    </div>
  ),
};

/** Public invoice with shared users. */
export const PublicInvoice: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>Sharing &amp; Access</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700'>👤</div>
          <div>
            <p className='text-sm font-medium'>Owner</p>
            <p className='text-xs text-gray-500'>john.doe</p>
          </div>
        </div>
        <hr />
        <div className='rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-200'>
          🌐 <strong>Public Invoice</strong> — Anyone with the link can view this invoice.
        </div>
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Shared With</h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700'>👤</div>
              <span className='text-sm'>user-abc-123</span>
            </div>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2 border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          🔗 Share Invoice →
        </button>
        <button
          type='button'
          className='w-full rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700'>
          Mark as Private 🔒
        </button>
      </div>
    </div>
  ),
};
