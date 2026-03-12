import type {Meta, StoryObj} from "@storybook/react";

/**
 * UploadPreview displays a grid of pending file uploads with status indicators,
 * progress bars, and remove buttons. Depends on `useScanUpload`.
 *
 * This story renders static previews of various upload states.
 */
const meta = {
  title: "Invoices/UploadScans/UploadPreview",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mixed upload states — pending, uploading, completed, failed. */
export const MixedStates: Story = {
  render: () => (
    <div>
      <div className='mb-4'>
        <h2 className='text-lg font-semibold'>Pending Uploads (4)</h2>
      </div>
      <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-4'>
        {/* Pending */}
        <div className='overflow-hidden rounded-lg border bg-white dark:bg-gray-900'>
          <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
            <img src='https://picsum.photos/seed/upload1/400/300' alt='Pending upload' className='h-full w-full object-cover' />
            <div className='absolute top-2 right-2'>
              <span className='rounded-full bg-gray-500/80 px-2 py-0.5 text-xs text-white'>Pending</span>
            </div>
            <button
              type='button'
              className='absolute top-2 left-2 rounded-full bg-black/50 p-1 text-white'>
              🗑
            </button>
          </div>
          <div className='p-2'>
            <p className='truncate text-sm font-medium'>receipt-01.jpg</p>
            <p className='text-xs text-gray-500'>1.2 MB</p>
          </div>
        </div>

        {/* Uploading */}
        <div className='overflow-hidden rounded-lg border bg-white dark:bg-gray-900'>
          <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
            <img src='https://picsum.photos/seed/upload2/400/300' alt='Uploading scan' className='h-full w-full object-cover' />
            <div className='absolute inset-0 flex items-center justify-center bg-blue-500/30'>
              <span className='animate-spin text-2xl'>⏳</span>
            </div>
            <div className='absolute top-2 right-2'>
              <span className='rounded-full bg-blue-500/80 px-2 py-0.5 text-xs text-white'>Uploading</span>
            </div>
          </div>
          <div className='p-2'>
            <p className='truncate text-sm font-medium'>receipt-02.png</p>
            <p className='text-xs text-gray-500'>2.5 MB</p>
            <div className='mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700'>
              <div
                className='h-full bg-blue-500'
                style={{width: "65%"}}
              />
            </div>
            <p className='text-xs text-gray-500'>65%</p>
          </div>
        </div>

        {/* Completed */}
        <div className='overflow-hidden rounded-lg border bg-white dark:bg-gray-900'>
          <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
            <img src='https://picsum.photos/seed/upload3/400/300' alt='Completed upload' className='h-full w-full object-cover' />
            <div className='absolute inset-0 flex items-center justify-center bg-green-500/30'>
              <span className='text-2xl'>✅</span>
            </div>
            <div className='absolute top-2 right-2'>
              <span className='rounded-full bg-green-500/80 px-2 py-0.5 text-xs text-white'>Completed</span>
            </div>
          </div>
          <div className='p-2'>
            <p className='truncate text-sm font-medium'>receipt-03.jpg</p>
            <p className='text-xs text-gray-500'>800 KB</p>
          </div>
        </div>

        {/* Failed */}
        <div className='overflow-hidden rounded-lg border bg-white dark:bg-gray-900'>
          <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
            <img src='https://picsum.photos/seed/upload4/400/300' alt='Failed upload' className='h-full w-full object-cover' />
            <div className='absolute inset-0 flex items-center justify-center bg-red-500/30'>
              <span className='text-2xl'>❌</span>
            </div>
            <div className='absolute top-2 right-2'>
              <span className='rounded-full bg-red-500/80 px-2 py-0.5 text-xs text-white'>Failed</span>
            </div>
            <button
              type='button'
              className='absolute top-2 left-2 rounded-full bg-black/50 p-1 text-white'>
              🗑
            </button>
          </div>
          <div className='p-2'>
            <p className='truncate text-sm font-medium'>invoice.pdf</p>
            <p className='text-xs text-gray-500'>5.1 MB</p>
            <p className='text-xs text-red-500'>Upload failed. Please try again.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
