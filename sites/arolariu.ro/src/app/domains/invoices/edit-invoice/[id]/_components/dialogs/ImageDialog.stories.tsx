import type {Meta, StoryObj} from "@storybook/react";
import {TbPhoto} from "react-icons/tb";

/**
 * Static visual preview of the ImageDialog component.
 *
 * The actual component depends on `useDialog` context with a payload URL,
 * so this story renders a faithful HTML replica of the full-width dialog
 * with a receipt image placeholder.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ImageDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-4xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default image dialog with receipt placeholder. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Receipt Image</h2>
      </div>
      <div className='relative flex aspect-[3/4] max-h-[500px] items-center justify-center bg-gray-50 dark:bg-gray-800'>
        <div className='text-center'>
          <TbPhoto className='mx-auto h-16 w-16 text-gray-300' />
          <p className='mt-2 text-sm text-gray-400'>Receipt scan preview</p>
          <p className='text-xs text-gray-400'>receipt-001.jpg</p>
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
