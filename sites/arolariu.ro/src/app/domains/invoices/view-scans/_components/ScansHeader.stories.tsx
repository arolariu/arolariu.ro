import type {Meta, StoryObj} from "@storybook/react";

/**
 * ScansHeader shows the scan count, sync status, and action buttons
 * (upload, invoices, sync). Depends on `useScans` hook.
 *
 * This story renders a static preview of the scans header.
 */
const meta = {
  title: "Invoices/ViewScans/ScansHeader",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default header with scans and sync info. */
export const Default: Story = {
  render: () => (
    <div className='flex flex-col gap-4 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900'>
      <div className='flex items-center gap-2'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Your Scans (12)</h1>
          <p className='text-sm text-gray-500'>Last synced: 5m ago</p>
        </div>
        <button
          type='button'
          className='mt-1 text-gray-400 hover:text-gray-600'
          title='Scans are stored locally and synced with the server'>
          ℹ️
        </button>
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className='flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm text-white'>
          📤 Upload More
        </button>
        <button
          type='button'
          className='flex items-center gap-2 rounded-md border px-4 py-2 text-sm dark:border-gray-600'>
          📄 My Invoices
        </button>
        <button
          type='button'
          className='flex items-center gap-2 rounded-md border px-4 py-2 text-sm dark:border-gray-600'>
          🔄 Sync
        </button>
      </div>
    </div>
  ),
};

/** Syncing state. */
export const Syncing: Story = {
  render: () => (
    <div className='flex flex-col gap-4 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Your Scans (12)</h1>
        <p className='text-sm text-gray-500'>Syncing...</p>
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className='rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm text-white'>
          📤 Upload
        </button>
        <button
          type='button'
          disabled
          className='flex items-center gap-2 rounded-md border px-4 py-2 text-sm opacity-50 dark:border-gray-600'>
          <span className='animate-spin'>🔄</span> Syncing...
        </button>
      </div>
    </div>
  ),
};
