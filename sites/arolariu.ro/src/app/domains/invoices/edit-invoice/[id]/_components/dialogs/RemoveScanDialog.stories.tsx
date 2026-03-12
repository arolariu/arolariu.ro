import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbPhoto, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the RemoveScanDialog component.
 *
 * The actual component depends on `useDialog` context and server actions
 * for scan deletion, so this story renders a faithful HTML replica
 * of the scan removal confirmation dialog with image preview.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RemoveScanDialog",
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

/** Default remove scan confirmation dialog. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='flex items-center gap-2 text-lg font-semibold'>
          <TbAlertTriangle className='h-5 w-5 text-red-500' />
          Remove Scan
        </h2>
        <p className='mt-1 text-sm text-gray-500'>Remove scan 2 of 3 from this invoice.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Scan Preview */}
        <div className='overflow-hidden rounded-lg border'>
          <div className='flex aspect-[4/3] items-center justify-center bg-gray-100 dark:bg-gray-800'>
            <div className='text-center'>
              <TbPhoto className='mx-auto h-12 w-12 text-gray-300' />
              <p className='mt-2 text-sm text-gray-400'>receipt-scan-002.jpg</p>
            </div>
          </div>
        </div>
        <p className='text-center text-xs text-gray-500'>Scan 2 of 3</p>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700'>
          <TbTrash className='h-4 w-4' />
          Remove
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
