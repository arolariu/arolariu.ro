import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowRight, TbFileInvoice, TbPhoto, TbSparkles, TbStack2} from "react-icons/tb";

/**
 * Static visual preview of the CreateInvoiceDialog component.
 *
 * @remarks Static preview — component imports from `@/stores` barrel which includes
 * `preferencesStore` that imports "use server" action (setCookie) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useDialog` context and Zustand stores.
 * This story renders a faithful HTML replica of the creation wizard's selection step.
 */
const meta = {
  title: "Invoices/ViewScans/Dialogs/CreateInvoiceDialog",
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

/** Default wizard selection step with scan previews and mode options. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='flex items-center gap-2 text-lg font-semibold'>
          <TbFileInvoice className='h-5 w-5 text-purple-500' />
          Create Invoices
        </h2>
        <p className='mt-1 text-sm text-gray-500'>Choose how to create invoices from your scans.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Scans Preview */}
        <div className='rounded-lg border bg-gray-50 p-3 dark:bg-gray-800'>
          <div className='flex items-center justify-between text-xs'>
            <span className='font-medium'>Selected Scans (3)</span>
            <span className='text-gray-500'>2.4 MB total</span>
          </div>
          <div className='mt-2 flex gap-2'>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className='flex h-14 w-14 items-center justify-center rounded-md border bg-white dark:bg-gray-700'>
                <TbPhoto className='h-6 w-6 text-gray-300' />
              </div>
            ))}
          </div>
        </div>

        {/* Mode Selection */}
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Choose creation mode:</p>

          {/* Single mode */}
          <label className='flex cursor-pointer items-start gap-3 rounded-lg border-2 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20'>
            <input
              type='radio'
              className='mt-0.5'
              checked
              readOnly
            />
            <div>
              <span className='flex items-center gap-2 font-medium'>
                <TbPhoto className='h-4 w-4 text-purple-500' />
                One invoice per scan
              </span>
              <p className='mt-0.5 text-xs text-gray-500'>Creates 3 separate invoices, one for each scan.</p>
            </div>
          </label>

          {/* Batch mode */}
          <label className='flex cursor-pointer items-start gap-3 rounded-lg border p-3'>
            <input
              type='radio'
              className='mt-0.5'
              readOnly
            />
            <div>
              <span className='flex items-center gap-2 font-medium'>
                <TbStack2 className='h-4 w-4 text-blue-500' />
                Combine into one invoice
              </span>
              <p className='mt-0.5 text-xs text-gray-500'>Merges all 3 scans into a single invoice.</p>
            </div>
          </label>
        </div>

        {/* Single scan info */}
        <div className='rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20'>
          <div className='flex items-center gap-2'>
            <TbSparkles className='h-4 w-4 text-purple-500' />
            <div>
              <p className='text-sm font-medium text-purple-800 dark:text-purple-300'>AI-Powered Processing</p>
              <p className='text-xs text-purple-600 dark:text-purple-400'>Each scan will be analyzed with OCR and categorization.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm text-white'>
          Create 3 Invoices
          <TbArrowRight className='h-4 w-4' />
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
