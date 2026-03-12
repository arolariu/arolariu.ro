import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbClipboard, TbHome, TbRefresh} from "react-icons/tb";

/**
 * Static visual preview of the GlobalError component.
 *
 * The actual component renders a full HTML shell (html/body) with error
 * boundary recovery, QR diagnostics, and context providers. This story
 * renders a faithful HTML replica of the error UI content without the
 * full document shell.
 */
const meta = {
  title: "App/GlobalError",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className='min-h-screen bg-gray-50 p-4 dark:bg-gray-950'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default global error page with error details card. */
export const Default: Story = {
  render: () => (
    <div className='mx-auto max-w-2xl space-y-8 py-12'>
      {/* Hero Section */}
      <section className='text-center'>
        <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30'>
          <TbAlertTriangle className='h-10 w-10 text-red-600 dark:text-red-400' />
        </div>
        <h1 className='mt-4 text-3xl font-bold'>Something went wrong</h1>
        <p className='mt-2 text-gray-500'>An unexpected error occurred. We&apos;re sorry for the inconvenience.</p>
      </section>

      {/* Error Details Card */}
      <div className='rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900'>
        <div className='border-b p-6'>
          <h2 className='flex items-center gap-2 text-lg font-semibold'>
            <TbAlertTriangle className='h-5 w-5 text-red-500' />
            Error Details
          </h2>
          <p className='mt-1 text-sm text-gray-500'>
            Error ID: <code className='rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800'>ERR_A1B2C3D4</code>
          </p>
        </div>

        <div className='space-y-4 p-6'>
          {/* Error Alert */}
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50'>
            <h4 className='flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300'>
              <TbAlertTriangle className='h-4 w-4' />
              What happened?
            </h4>
            <p className='mt-1 text-sm text-red-700 dark:text-red-400'>TypeError: Cannot read properties of undefined (reading &apos;map&apos;)</p>
          </div>

          {/* What to do */}
          <div className='rounded-lg border bg-gray-50 p-4 dark:bg-gray-800'>
            <h3 className='text-sm font-semibold'>What can you do?</h3>
            <ul className='mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400'>
              <li>• Try refreshing the page</li>
              <li>• Clear your browser cache and try again</li>
              <li>• If the problem persists, contact support</li>
            </ul>
          </div>

          {/* QR Code placeholder */}
          <div className='text-center'>
            <p className='text-xs text-gray-500'>Scan to share diagnostics</p>
            <div className='mx-auto mt-2 flex h-32 w-32 items-center justify-center rounded-lg border bg-white dark:bg-gray-800'>
              <span className='text-xs text-gray-300'>QR Code</span>
            </div>
          </div>

          {/* Technical details */}
          <details className='rounded-lg border'>
            <summary className='cursor-pointer px-4 py-2 text-sm font-medium'>Technical Details</summary>
            <div className='border-t p-4'>
              <pre className='overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs dark:bg-gray-800'>
                <code>
                  {JSON.stringify(
                    {
                      errorId: "ERR_A1B2C3D4",
                      errorMessage: "Cannot read properties of undefined",
                      timestamp: "2025-01-15T10:30:00.000Z",
                      url: "https://arolariu.ro/domains/invoices",
                    },
                    null,
                    2,
                  )}
                </code>
              </pre>
            </div>
          </details>
        </div>

        <div className='flex flex-wrap gap-2 border-t p-4'>
          <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
            <TbRefresh className='h-4 w-4' />
            Try Again
          </button>
          <button className='flex items-center gap-2 rounded-md border px-4 py-2 text-sm'>
            <TbHome className='h-4 w-4' />
            Return Home
          </button>
          <button className='flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'>
            <TbClipboard className='h-4 w-4' />
            Copy Error ID
          </button>
        </div>
      </div>

      {/* Support Section */}
      <section className='text-center'>
        <p className='text-sm text-gray-500'>
          Need help? Contact{" "}
          <span className='text-purple-600 underline dark:text-purple-400'>admin@arolariu.ro</span> with error ID{" "}
          <code className='rounded bg-gray-100 px-1 text-xs dark:bg-gray-800'>ERR_A1B2C3D4</code>
        </p>
      </section>
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
